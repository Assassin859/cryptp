import { ethers } from 'ethers';
import { VM } from '@ethereumjs/vm';
import { Common } from '@ethereumjs/common';
import { Address, Account, bytesToHex, hexToBytes } from '@ethereumjs/util';
import { TransactionFactory, type LegacyTxData } from '@ethereumjs/tx';
import { keccak256 } from 'ethereum-cryptography/keccak';
import { priceService } from './PriceService';


import { DEFAULT_GAS_LIMIT } from '../constants/gas';
import { encodeConstructorSuffix } from './constructorArgs';

export interface EventLog {
  address: string;
  topics: string[];
  data: string;
}

export interface GasReport {
  total: number;
  execution: number;
  intrinsic: number;
}


/**
 * BrowserVM is an intelligent RPC bridge to your True In-Browser EVM.
 * It strictly uses @ethereumjs/vm, ensuring accurate math, state, and gas reporting
 * directly inside the browser without requiring any local backend instances.
 */
export interface EvmInitStatus {
  ready: boolean;
  failed: boolean;
  error: string | null;
}

export interface CallFrame {
  type: string; // CALL, DELEGATECALL, STATICCALL
  from: string;
  to: string;
  value: string;
  gas: number;
  gasUsed: number;
  input: string;
  output: string;
  calls?: CallFrame[];
}

interface EvmStep {
  pc: number;
  op: string;
  gasCost: number;
  gas: string;
  depth: number;
}

export interface TransactionTrace {
  gas: number;
  returnValue: string;
  structLogs: EvmStep[];
  traceTree?: CallFrame;
}

export interface ReplayEntry {
  id: string;
  deployment_kind: 'deploy' | 'execute' | 'promoted';
  bytecode?: string;
  constructor_args?: unknown[];
  abi?: unknown[];
  contract_address?: string;
  call_data?: string;
  call_value_wei?: string;
  gas_limit?: number;
}

export interface RehydrateResult {
  addressMap: Map<string, string>;
  txHashMap: Map<string, string>;
  errors: string[];
}

const INITIAL_BLOCK = 18000000;

class BrowserVM {
  private evmInstance: VM | null = null;
  private evmAccounts: Address[] = [];
  private evmPrivateKeys: Uint8Array[] = [];
  private activeAccountIndex: number = 0;
  private transactionTraces = new Map<string, TransactionTrace>();
  private blockNumber: number = INITIAL_BLOCK;
  private initFailed = false;
  private initError: string | null = null;
  /** Deduplication guard — ensures concurrent init() calls share one promise. */
  private _initPromise: Promise<void> | null = null;
  /** Top-level structLog depth observed from @ethereumjs/evm (0 or 1). */
  private traceDepthFilter: number | null = null;

  constructor() {
    // Lazy initialization
  }

  getInitStatus(): EvmInitStatus {
    return {
      ready: this.evmInstance !== null && !this.initFailed,
      failed: this.initFailed,
      error: this.initError,
    };
  }

  async init() {
     await this.initEVM();
  }

  /** Depth used by gas profiler to filter top-level execution steps. */
  getTraceDepthFilter(): number {
    return this.traceDepthFilter ?? 0;
  }

  private calibrateTraceDepth(structLogs: EvmStep[]) {
    if (this.traceDepthFilter !== null || structLogs.length === 0) return;
    const depths = structLogs.map((l) => l.depth);
    const minDepth = Math.min(...depths);
    this.traceDepthFilter = minDepth;
  }

  /** Tear down and re-create a fresh in-browser EVM. */
  async reset(): Promise<void> {
    this.evmInstance = null;
    this.evmAccounts = [];
    this.evmPrivateKeys = [];
    this.activeAccountIndex = 0;
    this.transactionTraces.clear();
    this.blockNumber = INITIAL_BLOCK;
    this.initFailed = false;
    this.initError = null;
    this._initPromise = null;
    this.traceDepthFilter = null;
    await this.initEVM();
  }

  /**
   * Replay stored deploy + execute rows into a fresh VM.
   * Returns address/tx hash maps because CREATE addresses may differ after redeploy.
   */
  async rehydrate(replayLog: ReplayEntry[]): Promise<RehydrateResult> {
    await this.init();
    const addressMap = new Map<string, string>();
    const txHashMap = new Map<string, string>();
    const errors: string[] = [];

    for (const entry of replayLog) {
      if (entry.deployment_kind === 'promoted') continue;

      try {
        if (entry.deployment_kind === 'deploy') {
          if (!entry.bytecode) {
            errors.push(`Deploy ${entry.id}: missing bytecode`);
            continue;
          }
          let finalBytecode = entry.bytecode.startsWith('0x')
            ? entry.bytecode
            : '0x' + entry.bytecode;
          if (entry.constructor_args && entry.constructor_args.length > 0) {
            finalBytecode += encodeConstructorSuffix(
              entry.constructor_args,
              entry.abi
            );
          }
          const gasLimit = entry.gas_limit
            ? Number(entry.gas_limit)
            : DEFAULT_GAS_LIMIT;
          const result = await this.deployContract(finalBytecode, gasLimit);
          if (entry.contract_address) {
            addressMap.set(
              entry.contract_address.toLowerCase(),
              result.contractAddress.toLowerCase()
            );
          }
          txHashMap.set(entry.id, result.transactionHash);
        } else if (entry.deployment_kind === 'execute') {
          const storedTo = entry.contract_address?.toLowerCase() ?? '';
          const liveTo =
            addressMap.get(storedTo) ?? entry.contract_address ?? '';
          if (!liveTo || !entry.call_data) {
            errors.push(`Execute ${entry.id}: missing target or calldata`);
            continue;
          }
          const value = entry.call_value_wei ? BigInt(entry.call_value_wei) : 0n;
          const gasLimit = entry.gas_limit
            ? Number(entry.gas_limit)
            : DEFAULT_GAS_LIMIT;
          const result = await this.sendTransaction(
            liveTo,
            entry.call_data,
            value,
            gasLimit
          );
          txHashMap.set(entry.id, result.transactionHash);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${entry.deployment_kind} ${entry.id}: ${msg}`);
        console.warn('[browserVM] Rehydrate step failed:', msg);
      }
    }

    return { addressMap, txHashMap, errors };
  }

  private getEvmEvents() {
    const events = this.evmInstance?.evm?.events;
    if (!events) {
      throw new Error(this.initError || 'EVM VM not properly initialized');
    }
    return events;
  }

  private async initEVM() {
    // Already initialized — fast path.
    if (this.evmInstance) return;

    // Another caller is already running init — share their promise to avoid
    // parallel initialization (race condition guard).
    if (this._initPromise) {
      return this._initPromise;
    }

    this._initPromise = (async () => {
      // Double-check after acquiring (another caller may have finished between checks).
      if (this.evmInstance) return;
      this.initFailed = false;
      this.initError = null;
      try {
        const common = new Common({ 
          chain: 'mainnet', 
          hardfork: 'shanghai',
        });
        (common as Common & { customCrypto?: { keccak256: typeof keccak256 } }).customCrypto = { keccak256 };
        this.evmInstance = await VM.create({ common });
        
        // Create 5 default accounts with 100 ETH each
        const basePrivKey = '111111111111111111111111111111111111111111111111111111111111111';
        for (let i = 1; i <= 5; i++) {
          const pkBytes = hexToBytes('0x' + basePrivKey + i);
          const address = Address.fromPrivateKey(pkBytes);
          this.evmPrivateKeys.push(pkBytes);
          this.evmAccounts.push(address);
          
          await this.evmInstance.stateManager.putAccount(
            address, 
            new Account(0n, 100000000000000000000n) // 100 ETH
          );
        }
        console.log('True In-Browser Simulation Mode Active. 5 EVM Accounts Initialized.');
      } catch (err) {
        this.initFailed = true;
        this.initError = err instanceof Error ? err.message : 'Failed to initialize In-Browser EVM';
        this.evmInstance = null;
        console.error('Failed to initialize In-Browser EVM:', err);
      } finally {
        // Release the guard so future callers (e.g. after a failed init) can retry.
        this._initPromise = null;
      }
    })();

    return this._initPromise;
  }

  async getBlockNumber(): Promise<number> {
      return this.blockNumber;
  }

  async getAccountBalance(addressStr: string): Promise<string> {
      await this.init();
      if (!this.evmInstance) return '0';
      
      try {
        const address = Address.fromString(addressStr);
        const account = await this.evmInstance.stateManager.getAccount(address);
        return account ? ethers.formatEther(account.balance) : '0';
      } catch {
        return '0';
      }
  }

  getAccounts() {
      return this.evmAccounts.map(a => a.toString());
  }

  getActiveAccount() {
      if (this.evmAccounts.length === 0) return '0x0';
      return this.evmAccounts[this.activeAccountIndex].toString();
  }

  setActiveAccount(index: number) {
      if (index >= 0 && index < this.evmAccounts.length) {
          this.activeAccountIndex = index;
      }
  }

  async deployContract(bytecode: string, gasLimit: number = DEFAULT_GAS_LIMIT): Promise<{ 
    contractAddress: string; 
    transactionHash: string; 
    gasUsed: number;
    gasReport: GasReport;
    logs: EventLog[];
  }> {
    await this.init();

    if (!this.evmInstance || this.evmAccounts.length === 0) {
        throw new Error("EVM VM Not properly Initialized");
    }

    const currentAccount = this.evmAccounts[this.activeAccountIndex];
    const currentPk = this.evmPrivateKeys[this.activeAccountIndex];

    console.log('Executing deployment (In-Browser EVM)...');
    try {
      const data = hexToBytes(bytecode.startsWith('0x') ? bytecode : '0x' + bytecode);
      
      const accountState = await this.evmInstance.stateManager.getAccount(currentAccount);
      const currentNonce = accountState ? accountState.nonce : 0n;

      const gasPriceGwei = await priceService.getGasPrice();
      const gasPriceWei = BigInt(Math.floor(gasPriceGwei * 1e9));

      const txData = {
          nonce: currentNonce,
          gasLimit: BigInt(gasLimit),
          gasPrice: gasPriceWei,
          data,
      };

      const tx = TransactionFactory.fromTxData(txData, { common: this.evmInstance.common }).sign(currentPk);
      const txHashStr = bytesToHex(tx.hash());

      const trace: TransactionTrace = { gas: 0, returnValue: "", structLogs: [] };
      const stepListener = (step: { pc: number; opcode: { name: string; fee: number }; gasLeft: { toString(): string }; depth: number }, next?: () => void) => {
          trace.structLogs.push({
              pc: step.pc,
              op: step.opcode.name,
              gasCost: step.opcode.fee,
              gas: step.gasLeft.toString(),
              depth: step.depth,
          });
          next?.();
      };
      
      const frameStack: CallFrame[] = [];
      let rootFrame: CallFrame | null = null;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const beforeMessageListener = (message: any, next?: () => void) => {
          const frame: CallFrame = {
              type: message.delegatecall ? 'DELEGATECALL' : message.isStatic ? 'STATICCALL' : 'CALL',
              from: message.caller ? message.caller.toString() : '0x',
              to: message.to ? message.to.toString() : (message.codeAddress ? message.codeAddress.toString() : '0x'),
              value: message.value ? message.value.toString() : '0',
              gas: Number(message.gasLimit),
              gasUsed: 0,
              input: message.data ? bytesToHex(message.data) : '0x',
              output: '',
              calls: []
          };
          if (frameStack.length > 0) {
              const parent = frameStack[frameStack.length - 1];
              if (!parent.calls) parent.calls = [];
              parent.calls.push(frame);
          } else {
              rootFrame = frame;
          }
          frameStack.push(frame);
          next?.();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const afterMessageListener = (result: any, next?: () => void) => {
          const frame = frameStack.pop();
          if (frame && result.execResult) {
              frame.gasUsed = Number(result.execResult.executionGasUsed);
              frame.output = result.execResult.returnValue ? bytesToHex(result.execResult.returnValue) : '0x';
          }
          next?.();
      };

      const events = this.getEvmEvents();
      events.on('step', stepListener);
      events.on('beforeMessage', beforeMessageListener);
      events.on('afterMessage', afterMessageListener);

      let result;
      try {
        result = await this.evmInstance.runTx({ tx });
      } finally {
        events.removeListener('step', stepListener);
        events.removeListener('beforeMessage', beforeMessageListener);
        events.removeListener('afterMessage', afterMessageListener);
      }

      if (rootFrame) {
          trace.traceTree = rootFrame;
      }
      
      trace.gas = Number(result.totalGasSpent);
      trace.returnValue = result.execResult.returnValue ? bytesToHex(result.execResult.returnValue) : "";
      this.calibrateTraceDepth(trace.structLogs);
      this.transactionTraces.set(txHashStr, trace);
      
      if (result.execResult.exceptionError) {
            let revertReason = result.execResult.exceptionError.error;
            const returnData = bytesToHex(result.execResult.returnValue);
            if (returnData.startsWith('0x08c379a0')) {
               try {
                 const iface = new ethers.Interface(["error Error(string)"]);
                 revertReason = iface.decodeErrorResult("Error", returnData)[0];
               } catch { /* ignore decode failure */ }
            }
            throw new Error("EVM Revert: " + revertReason);
      }

      const gasUsedNum = Number(result.totalGasSpent);
      const logs = result.execResult.logs?.map(l => ({
          address: bytesToHex(l[0]),
          topics: l[1].map(t => bytesToHex(t)),
          data: bytesToHex(l[2])
      })) || [];

      this.blockNumber++; // Increment block on successful deployment
      return {
          contractAddress: result.createdAddress ? result.createdAddress.toString() : '0x0',
          transactionHash: bytesToHex(tx.hash()),
          gasUsed: gasUsedNum,
          gasReport: { total: gasUsedNum, execution: gasUsedNum - 21000, intrinsic: 21000 },
          logs
      };
    } catch (err) {
        console.error("EVM deployment failed:", err);
        throw err;
    }
  }

  async runCall(to: string, data: string): Promise<{ returnValue: string; gasUsed: number }> {
     await this.init();
     
     if (!this.evmInstance || this.evmAccounts.length === 0) {
         throw new Error("EVM VM Not properly Initialized");
     }

     const currentAccount = this.evmAccounts[this.activeAccountIndex];

     try {
         // We use runCall for pure read operations which avoids state mutations
         const result = await this.evmInstance.evm.runCall({
             to: Address.fromString(to),
             caller: currentAccount,
             data: hexToBytes(data.startsWith('0x') ? data : '0x' + data),
         });

         if (result.execResult.exceptionError) {
             let revertReason = result.execResult.exceptionError.error;
             const returnData = bytesToHex(result.execResult.returnValue);
             if (returnData.startsWith('0x08c379a0')) {
                try {
                  const iface = new ethers.Interface(["error Error(string)"]);
                  revertReason = iface.decodeErrorResult("Error", returnData)[0];
                } catch { /* ignore decode failure */ }
             }
             throw new Error("EVM Revert: " + revertReason);
         }

         return { 
             returnValue: bytesToHex(result.execResult.returnValue), 
             gasUsed: Number(result.execResult.executionGasUsed) 
         };
     } catch (err) {
         console.error("EVM runCall failed:", err);
         throw err;
     }
  }

  async sendTransaction(to: string, data: string, value: bigint = 0n, gasLimit: number = DEFAULT_GAS_LIMIT): Promise<{ 
    transactionHash: string; 
    gasUsed: number;
    gasReport: GasReport;
    logs: EventLog[];
  }> {
     await this.init();
     
     if (!this.evmInstance || this.evmAccounts.length === 0) {
         throw new Error("EVM VM Not properly Initialized");
     }

     const currentAccount = this.evmAccounts[this.activeAccountIndex];
     const currentPk = this.evmPrivateKeys[this.activeAccountIndex];

     try {
        const accountState = await this.evmInstance.stateManager.getAccount(currentAccount);
        const currentNonce = accountState ? accountState.nonce : 0n;

        const gasPriceGwei = await priceService.getGasPrice();
        const gasPriceWei = BigInt(Math.floor(gasPriceGwei * 1e9));

        const txData: LegacyTxData = {
            to: Address.fromString(to),
            nonce: currentNonce,
            gasLimit: BigInt(gasLimit),
            gasPrice: gasPriceWei,
            value,
            data: hexToBytes(data.startsWith('0x') ? data : '0x' + data),
        };

        const tx = TransactionFactory.fromTxData(txData, { common: this.evmInstance.common }).sign(currentPk);
        const txHashStr = bytesToHex(tx.hash());

        const trace: TransactionTrace = { gas: 0, returnValue: "", structLogs: [] };
        const stepListener = (step: { pc: number; opcode: { name: string; fee: number }; gasLeft: { toString(): string }; depth: number }, next?: () => void) => {
            trace.structLogs.push({
                pc: step.pc,
                op: step.opcode.name,
                gasCost: step.opcode.fee,
                gas: step.gasLeft.toString(),
                depth: step.depth,
            });
            next?.();
        };

        const frameStack: CallFrame[] = [];
        let rootFrame: CallFrame | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const beforeMessageListener = (message: any, next?: () => void) => {
            const frame: CallFrame = {
                type: message.delegatecall ? 'DELEGATECALL' : message.isStatic ? 'STATICCALL' : 'CALL',
                from: message.caller ? message.caller.toString() : '0x',
                to: message.to ? message.to.toString() : (message.codeAddress ? message.codeAddress.toString() : '0x'),
                value: message.value ? message.value.toString() : '0',
                gas: Number(message.gasLimit),
                gasUsed: 0,
                input: message.data ? bytesToHex(message.data) : '0x',
                output: '',
                calls: []
            };
            if (frameStack.length > 0) {
                const parent = frameStack[frameStack.length - 1];
                if (!parent.calls) parent.calls = [];
                parent.calls.push(frame);
            } else {
                rootFrame = frame;
            }
            frameStack.push(frame);
            next?.();
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const afterMessageListener = (result: any, next?: () => void) => {
            const frame = frameStack.pop();
            if (frame && result.execResult) {
                frame.gasUsed = Number(result.execResult.executionGasUsed);
                frame.output = result.execResult.returnValue ? bytesToHex(result.execResult.returnValue) : '0x';
            }
            next?.();
        };

        const txEvents = this.getEvmEvents();
        txEvents.on('step', stepListener);
        txEvents.on('beforeMessage', beforeMessageListener);
        txEvents.on('afterMessage', afterMessageListener);

        let result;
        try {
          result = await this.evmInstance.runTx({ tx });
        } finally {
          txEvents.removeListener('step', stepListener);
          txEvents.removeListener('beforeMessage', beforeMessageListener);
          txEvents.removeListener('afterMessage', afterMessageListener);
        }

        if (rootFrame) {
            trace.traceTree = rootFrame;
        }
        
        trace.gas = Number(result.totalGasSpent);
        trace.returnValue = result.execResult.returnValue ? bytesToHex(result.execResult.returnValue) : "";
        this.calibrateTraceDepth(trace.structLogs);
        this.transactionTraces.set(txHashStr, trace);
        
        if (result.execResult.exceptionError) {
             let revertReason = result.execResult.exceptionError.error;
             const returnData = bytesToHex(result.execResult.returnValue);
             if (returnData.startsWith('0x08c379a0')) {
                try {
                  const iface = new ethers.Interface(["error Error(string)"]);
                  revertReason = iface.decodeErrorResult("Error", returnData)[0];
                } catch { /* ignore decode failure */ }
             }
             throw new Error("EVM Revert: " + revertReason);
        }

        const gasUsedNum = Number(result.totalGasSpent);
        const logs = result.execResult.logs?.map(l => ({
            address: bytesToHex(l[0]),
            topics: l[1].map(t => bytesToHex(t)),
            data: bytesToHex(l[2])
        })) || [];

        this.blockNumber++; // Increment block on successful txn
        return {
            transactionHash: bytesToHex(tx.hash()),
            gasUsed: gasUsedNum,
            gasReport: { total: gasUsedNum, execution: gasUsedNum - 21000, intrinsic: 21000 },
            logs
        };
     } catch (err) {
         console.error("EVM sendTransaction failed:", err);
         throw err;
     }
  }

  async getTransactionTrace(txHash: string): Promise<TransactionTrace | null> {
      return this.transactionTraces.get(txHash) || null;
  }
}

export const browserVM = new BrowserVM();
