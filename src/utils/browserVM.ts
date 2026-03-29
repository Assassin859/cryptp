import { VM } from '@ethereumjs/vm';
import { Common, Chain, Hardfork } from '@ethereumjs/common';
import { TransactionFactory } from '@ethereumjs/tx';
import { Address, hexToBytes, bytesToHex, Account } from '@ethereumjs/util';

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
 * BrowserVM is a singleton that manages an ephemeral, in-browser Ethereum Virtual Machine.
 * This satisfies the "Zero-Install" requirement by allowing full smart contract execution
 * without a local node or MetaMask.
 */
class BrowserVM {
  private vm: VM | null = null;
  private common: Common;
  private pkey = hexToBytes('0x53d2890538a798935398a79353289053d2890538a798935398a7935328905328');
  private address = Address.fromString('0x89f97Cb35236a1d0190FB25B31C5C0fF4107Ec1b');
  private nonce = BigInt(0);

  constructor() {
    this.common = new Common({ chain: Chain.Mainnet, hardfork: Hardfork.Shanghai });
  }

  async init() {
    if (this.vm) return;

    this.vm = await VM.create({
      common: this.common,
      activatePrecompiles: true,
    });

    // Genesis: Give our test account 100 ETH
    const balance = BigInt(100) * BigInt(10) ** BigInt(18);
    const account = Account.fromAccountData({
      nonce: BigInt(0),
      balance: balance,
    });
    
    await this.vm.stateManager.putAccount(this.address, account);

    console.log('In-Browser EVM Initialized with account:', this.address.toString());
  }

  async reset() {
    this.vm = null;
    this.nonce = BigInt(0);
    await this.init();
    console.log('In-Browser EVM Reset to Genesis state.');
  }

  async getBlockNumber(): Promise<number> {
    if (!this.vm) await this.init();
    const block = await this.vm!.blockchain.getCanonicalHeadBlock();
    return Number(block.header.number);
  }

  async deployContract(bytecode: string): Promise<{ 
    contractAddress: string; 
    transactionHash: string; 
    gasUsed: number;
    gasReport: GasReport;
    logs: EventLog[];
  }> {
    if (!this.vm) await this.init();

    const data = hexToBytes(bytecode.startsWith('0x') ? bytecode : '0x' + bytecode);
    
    const txData = {
      nonce: this.nonce,
      gasPrice: BigInt(2000000000), // 2 Gwei
      gasLimit: BigInt(3000000),
      data: data,
      value: BigInt(0),
    };

    const tx = TransactionFactory.fromTxData(txData, { common: this.common }).sign(this.pkey);
    this.nonce++;

    const result = await this.vm!.runTx({ tx });
    
    // Calculate contract address for the deployment
    const contractAddress = result.createdAddress?.toString() || '0x0';
    const txHash = bytesToHex(tx.hash());

    const totalGas = Number(result.totalGasSpent);
    const executionGas = Number(result.execResult.executionGasUsed);

    const logs: EventLog[] = result.execResult.logs?.map(log => ({
      address: log[0].toString(),
      topics: log[1].map(topic => bytesToHex(topic)),
      data: bytesToHex(log[2])
    })) || [];

    console.log('Contract Deployed to Browser VM:', contractAddress);

    return {
      contractAddress,
      transactionHash: txHash,
      gasUsed: totalGas,
      gasReport: {
        total: totalGas,
        execution: executionGas,
        intrinsic: totalGas - executionGas
      },
      logs
    };
  }


  /**
   * Run a "View" or "Pure" function call without creating a transaction on the blockchain.
   */
  async runCall(to: string, data: string): Promise<{ returnValue: string; gasUsed: number }> {
    if (!this.vm) await this.init();

    const target = Address.fromString(to);
    const input = hexToBytes(data.startsWith('0x') ? data : '0x' + data);

    const result = await this.vm!.evm.runCall({
      to: target,
      caller: this.address,
      data: input,
      gasLimit: BigInt(3000000),
    });

    if (result.execResult.exceptionError) {
      throw new Error(`EVM Call Exception: ${result.execResult.exceptionError.error}`);
    }

    return {
      returnValue: bytesToHex(result.execResult.returnValue),
      gasUsed: Number(result.execResult.executionGasUsed),
    };
  }

  /**
   * Run a state-changing transaction.
   */
  async sendTransaction(to: string, data: string): Promise<{ 
    transactionHash: string; 
    gasUsed: number;
    gasReport: GasReport;
    logs: EventLog[];
  }> {
    if (!this.vm) await this.init();

    const target = Address.fromString(to);
    const input = hexToBytes(data.startsWith('0x') ? data : '0x' + data);

    const txData = {
      to: target,
      nonce: this.nonce,
      gasPrice: BigInt(2000000000), // 2 Gwei
      gasLimit: BigInt(3000000),
      data: input,
      value: BigInt(0),
    };

    const tx = TransactionFactory.fromTxData(txData, { common: this.common }).sign(this.pkey);
    this.nonce++;

    const result = await this.vm!.runTx({ tx });
    
    if (result.execResult.exceptionError) {
      throw new Error(`EVM Transaction Exception: ${result.execResult.exceptionError.error}`);
    }

    const totalGas = Number(result.totalGasSpent);
    const executionGas = Number(result.execResult.executionGasUsed);

    const logs: EventLog[] = result.execResult.logs?.map(log => ({
      address: log[0].toString(),
      topics: log[1].map(topic => bytesToHex(topic)),
      data: bytesToHex(log[2])
    })) || [];

    return {
      transactionHash: bytesToHex(tx.hash()),
      gasUsed: totalGas,
      gasReport: {
        total: totalGas,
        execution: executionGas,
        intrinsic: totalGas - executionGas
      },
      logs
    };
  }

}

export const browserVM = new BrowserVM();
