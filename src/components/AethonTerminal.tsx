import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { browserVM } from '../utils/browserVM';
import { scanContract } from '../utils/securityScanner';
import { analyzeStorageLayout } from '../utils/StorageAnalyzer';
import { COMPLEX_FUNCTIONS, COMPLEX_FUNCTION_OVERHEAD } from '../constants/gas';
import { CompilationResult } from '../utils/hardhatCompiler';

interface AethonTerminalProps {
  currentProject: any;
  activeFileCode?: string;
  compileResult: any;
  securityReport: any;
  onCompile: () => Promise<CompilationResult | null>;
  onDeploy: () => Promise<void>;
  lastCompiledSource?: string | null;
}

const AethonTerminal: React.FC<AethonTerminalProps> = ({
  currentProject,
  activeFileCode,
  compileResult,
  securityReport,
  onCompile,
  onDeploy,
  lastCompiledSource,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);

  // Keep callback values up-to-date in refs so xterm event listeners don't lock stale closure state
  const stateRef = useRef({
    currentProject,
    activeFileCode,
    compileResult,
    securityReport,
    onCompile,
    onDeploy,
    lastCompiledSource,
  });

  useEffect(() => {
    stateRef.current = {
      currentProject,
      activeFileCode,
      compileResult,
      securityReport,
      onCompile,
      onDeploy,
      lastCompiledSource,
    };
  }, [currentProject, activeFileCode, compileResult, securityReport, onCompile, onDeploy, lastCompiledSource]);

  useEffect(() => {
    if (!terminalRef.current) return;

    // 1. Initialize xterm Terminal
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'underline',
      theme: {
        background: '#151515',
        foreground: '#cccccc',
        cursor: '#00ff00',
        selectionBackground: 'rgba(255, 255, 255, 0.15)',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
      },
      fontSize: 12,
      fontFamily: 'Consolas, "Courier New", monospace',
      rows: 10,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    termInstance.current = term;

    // Welcome banner
    term.writeln('\x1b[1;36m AETHON Intelligence System [v1.1.0] \x1b[0m');
    term.writeln(' Type \x1b[1;32mhelp\x1b[0m to list available console commands.\r\n');

    const prompt = () => {
      const projName = stateRef.current.currentProject?.name || 'sandbox';
      term.write(`\r\n\x1b[1;34m${projName.toLowerCase()} >\x1b[0m `);
    };

    prompt();

    let currentCommand = '';

    // 2. Input event listener
    const onKeyDispose = term.onKey(({ key, domEvent }) => {
      const ev = domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 13) {
        // ENTER KEY
        term.write('\r\n');
        const trimmedCommand = currentCommand.trim();
        if (trimmedCommand) {
          commandHistory.current.push(trimmedCommand);
          historyIndex.current = commandHistory.current.length;
          handleCommand(trimmedCommand, term);
        } else {
          prompt();
        }
        currentCommand = '';
      } else if (ev.keyCode === 8) {
        // BACKSPACE KEY
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          term.write('\b \b');
        }
      } else if (ev.keyCode === 38) {
        // UP ARROW (History)
        if (commandHistory.current.length > 0 && historyIndex.current > 0) {
          historyIndex.current--;
          for (let i = 0; i < currentCommand.length; i++) term.write('\b \b');
          currentCommand = commandHistory.current[historyIndex.current];
          term.write(currentCommand);
        }
      } else if (ev.keyCode === 40) {
        // DOWN ARROW (History)
        if (historyIndex.current < commandHistory.current.length - 1) {
          historyIndex.current++;
          for (let i = 0; i < currentCommand.length; i++) term.write('\b \b');
          currentCommand = commandHistory.current[historyIndex.current];
          term.write(currentCommand);
        } else if (historyIndex.current === commandHistory.current.length - 1) {
          historyIndex.current++;
          for (let i = 0; i < currentCommand.length; i++) term.write('\b \b');
          currentCommand = '';
        }
      } else if (ev.ctrlKey && ev.key === 'l') {
        // Ctrl+L — clear viewport (scrollback history remains accessible)
        term.clear();
        currentCommand = '';
        prompt();
      } else if (ev.ctrlKey && ev.key === 'c') {
        // Ctrl+C — cancel current input, newline so prompt appears on fresh line
        term.write('^C\r\n');
        currentCommand = '';
        prompt();
      } else if (printable) {
        currentCommand += key;
        term.write(key);
      }
    });

    // ─── Helpers ────────────────────────────────────────────────────────────────

    const hr = (char = '─', len = 56) => term.writeln('\x1b[90m' + char.repeat(len) + '\x1b[0m');

    const section = (title: string) => {
      hr();
      term.writeln(`\x1b[1;37m  ${title}\x1b[0m`);
      hr();
    };

    // ─── 3. Command execution handler ───────────────────────────────────────────
    const handleCommand = async (cmdString: string, term: Terminal) => {
      const parts = cmdString.trim().split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      switch (command) {

        // ── help ──────────────────────────────────────────────────────────────
        case 'help':
          term.writeln('\x1b[1;36m  AETHON CLI — Command Reference\x1b[0m');
          hr();
          const cmds = [
            ['help',            'Print this command reference.'],
            ['compile',         'Trigger WASM compilation on the active file.'],
            ['deploy',          'Deploy compiled bytecode to the Sandbox EVM.'],
            ['accounts',        'List Sandbox accounts with ETH balances.'],
            ['gas [fn]',        'Show gas estimates for ABI functions. Optionally filter by name.'],
            ['abi [fn]',        'Print ABI fragments. Optionally filter by name.'],
            ['storage',         'Analyze state variable storage layout (slots + packing).'],
            ['test <addr> <fn> [args...]', 'Call a view/pure function on a deployed contract.'],
            ['scan / audit',    'Run Security Radar and print the full audit report.'],
            ['active',          'Show the active project and file info.'],
            ['clear / cls',     'Clear the terminal screen.'],
            ['Ctrl+L',          'Clear screen (keyboard shortcut). Scrollback history preserved.'],
            ['Ctrl+C',          'Cancel current input, return to prompt.'],
          ];
          cmds.forEach(([cmd, desc]) => {
            term.writeln(`  \x1b[1;32m${cmd.padEnd(30)}\x1b[0m \x1b[90m${desc}\x1b[0m`);
          });
          break;

        // ── clear ─────────────────────────────────────────────────────────────
        case 'clear':
        case 'cls':
          term.clear();
          break;

        // ── active ────────────────────────────────────────────────────────────
        case 'active': {
          const proj = stateRef.current.currentProject;
          if (proj) {
            section('Active Context');
            term.writeln(`  Project : \x1b[1;33m${proj.name}\x1b[0m`);
            term.writeln(`  ID      : \x1b[90m${proj.id}\x1b[0m`);
            const filesCount = proj.files?.length ?? 0;
            term.writeln(`  Files   : ${filesCount} file${filesCount !== 1 ? 's' : ''}`);
          } else {
            term.writeln('\x1b[1;31m✖ No active project selected.\x1b[0m');
          }
          break;
        }

        // ── compile ───────────────────────────────────────────────────────────
        case 'compile':
          term.writeln('Executing WASM Compiler...');
          try {
            const res = await stateRef.current.onCompile();
            if (res && res.success) {
              term.writeln('\x1b[1;32m✔ Compilation Succeeded!\x1b[0m');
              if (res.contractSize) term.writeln(`  Contract Size : ${res.contractSize} bytes`);
              if (res.gasEstimate)  term.writeln(`  Gas Estimate  : ${res.gasEstimate.toLocaleString()} gas`);
            } else {
              term.writeln('\x1b[1;31m✖ Compilation Failed.\x1b[0m Check the Output tab for error details.');
            }
          } catch (e: any) {
            term.writeln(`\x1b[1;31m✖ Compiler error:\x1b[0m ${e.message}`);
          }
          break;

        // ── deploy ────────────────────────────────────────────────────────────
        case 'deploy': {
          const comp = stateRef.current.compileResult;
          if (!comp || !comp.success || !comp.bytecode) {
            term.writeln('\x1b[1;31m✖ Cannot deploy.\x1b[0m Run \x1b[1;32mcompile\x1b[0m successfully first.');
            break;
          }
          term.writeln('Deploying to browser simulation EVM...');
          try {
            await stateRef.current.onDeploy();
            term.writeln('\x1b[1;32m✔ Deployment successful!\x1b[0m See the Interaction tab.');
          } catch (e: any) {
            term.writeln(`\x1b[1;31m✖ Deployment failed:\x1b[0m ${e.message}`);
          }
          break;
        }

        // ── accounts ──────────────────────────────────────────────────────────
        case 'accounts':
          term.writeln('Querying Sandbox EVM accounts...');
          try {
            const accs = browserVM.getAccounts();
            const activeAcc = browserVM.getActiveAccount();
            section('Sandbox Accounts');
            for (let i = 0; i < accs.length; i++) {
              const balance = await browserVM.getAccountBalance(accs[i]);
              const isActive = accs[i].toLowerCase() === activeAcc.toLowerCase();
              const tag = isActive ? '\x1b[1;32m[Active]\x1b[0m' : '       ';
              term.writeln(`  ${tag} #${i}  \x1b[90m${accs[i]}\x1b[0m  \x1b[1;33m${balance} ETH\x1b[0m`);
            }
          } catch (e: any) {
            term.writeln(`\x1b[1;31m✖ Failed to query accounts:\x1b[0m ${e.message}`);
          }
          break;

        // ── gas [fn] ──────────────────────────────────────────────────────────
        case 'gas': {
          const res = stateRef.current.compileResult;
          if (!res || !res.success || !res.abi) {
            term.writeln('\x1b[1;31m✖ No compiled ABI found.\x1b[0m Run \x1b[1;32mcompile\x1b[0m first.');
            break;
          }
          const filter = args[0]?.toLowerCase() || '';
          const abi: any[] = Array.isArray(res.abi) ? res.abi : [];
          const fns = abi.filter(
            (item: any) => item.type === 'function' &&
            (!filter || item.name.toLowerCase().includes(filter))
          );

          if (fns.length === 0) {
            term.writeln(`\x1b[1;31m✖ No functions found${filter ? ` matching "${filter}"` : ''}.\x1b[0m`);
            break;
          }

          section(`Gas Estimates${filter ? ` (filter: "${filter}")` : ''}`);
          fns.forEach((fn: any) => {
            // Heuristic gas estimate based on mutability + input count
            let baseGas = 21000;
            if (fn.stateMutability === 'payable') baseGas = 45000;
            else if (fn.stateMutability === 'view' || fn.stateMutability === 'pure') baseGas = 0;
            else baseGas = 25000;
            const paramGas = (fn.inputs?.length || 0) * 1200;
            const complexityOverhead = (COMPLEX_FUNCTIONS as readonly string[]).includes(fn.name.toLowerCase())
              ? COMPLEX_FUNCTION_OVERHEAD : 0;
            const total = baseGas + paramGas + complexityOverhead;
            const mutColor = fn.stateMutability === 'view' || fn.stateMutability === 'pure'
              ? '\x1b[36m' : fn.stateMutability === 'payable' ? '\x1b[33m' : '\x1b[35m';
            const mutLabel = (fn.stateMutability || 'nonpayable').padEnd(12);
            const gasStr = total === 0 ? '\x1b[90m~0 (read)\x1b[0m' : `\x1b[1;33m~${total.toLocaleString()} gas\x1b[0m`;
            term.writeln(`  \x1b[1;32m${fn.name.padEnd(28)}\x1b[0m ${mutColor}${mutLabel}\x1b[0m ${gasStr}`);
          });
          term.writeln('\x1b[90m  Note: Values are heuristic estimates. Use Gas Profiler for real traces.\x1b[0m');
          break;
        }

        // ── abi [fn] ──────────────────────────────────────────────────────────
        case 'abi': {
          const res = stateRef.current.compileResult;
          if (!res || !res.success || !res.abi) {
            term.writeln('\x1b[1;31m✖ No compiled ABI found.\x1b[0m Run \x1b[1;32mcompile\x1b[0m first.');
            break;
          }
          const filter = args[0]?.toLowerCase() || '';
          const abi: any[] = Array.isArray(res.abi) ? res.abi : [];
          const items = abi.filter(
            (item: any) => !filter || (item.name || item.type || '').toLowerCase().includes(filter)
          );

          if (items.length === 0) {
            term.writeln(`\x1b[1;31m✖ No ABI entries found${filter ? ` matching "${filter}"` : ''}.\x1b[0m`);
            break;
          }

          section(`ABI Fragments${filter ? ` (filter: "${filter}")` : ''}`);
          items.forEach((item: any) => {
            const typeColor = item.type === 'function' ? '\x1b[1;32m'
              : item.type === 'event' ? '\x1b[1;36m'
              : item.type === 'error' ? '\x1b[1;31m'
              : '\x1b[1;33m';

            const inputs = (item.inputs || []).map((i: any) => `${i.type} ${i.name || ''}`).join(', ');
            const outputs = (item.outputs || []).map((o: any) => o.type).join(', ');
            const sig = item.name
              ? `${item.name}(${inputs})${outputs ? ` → (${outputs})` : ''}`
              : item.type;
            const mutLabel = item.stateMutability ? ` \x1b[90m[${item.stateMutability}]\x1b[0m` : '';

            term.writeln(`  ${typeColor}${(item.type || 'unknown').padEnd(12)}\x1b[0m ${sig}${mutLabel}`);
          });
          break;
        }

        // ── storage ───────────────────────────────────────────────────────────
        case 'storage': {
          const code = stateRef.current.activeFileCode;
          if (!code) {
            term.writeln('\x1b[1;31m✖ No source code loaded.\x1b[0m Open a Solidity file first.');
            break;
          }
          try {
            const layout = analyzeStorageLayout(code);
            if (layout.variables.length === 0) {
              term.writeln('\x1b[90m  No state variables found in this contract.\x1b[0m');
              break;
            }
            section(`Storage Layout — ${layout.totalSlots} slot${layout.totalSlots !== 1 ? 's' : ''}`);

            // Group by slot
            const bySlot = new Map<number, typeof layout.variables>();
            layout.variables.forEach(v => {
              if (!bySlot.has(v.slot)) bySlot.set(v.slot, []);
              bySlot.get(v.slot)!.push(v);
            });

            Array.from(bySlot.entries()).sort(([a], [b]) => a - b).forEach(([slot, vars]) => {
              const totalBytes = vars.reduce((s, v) => s + Math.min(v.byteSize, 32), 0);
              const fillBar = Math.round((totalBytes / 32) * 20);
              const bar = '█'.repeat(fillBar) + '░'.repeat(20 - fillBar);
              const barColor = layout.unpackedSlots.includes(slot) ? '\x1b[33m' : '\x1b[32m';
              const unpackedTag = layout.unpackedSlots.includes(slot) ? ' \x1b[33m[unpack]\x1b[0m' : '';
              term.writeln(`  \x1b[90mSlot 0x${slot.toString(16).padStart(2,'0')}\x1b[0m  ${barColor}${bar}\x1b[0m  \x1b[90m${totalBytes}/32B\x1b[0m${unpackedTag}`);
              vars.forEach(v => {
                const catColor = v.category === 'mapping' ? '\x1b[34m'
                  : v.category === 'array' ? '\x1b[36m'
                  : v.category === 'struct' ? '\x1b[33m'
                  : v.category === 'string' ? '\x1b[35m'
                  : '\x1b[37m';
                term.writeln(`    ${catColor}${v.name.padEnd(20)}\x1b[0m \x1b[90m${v.type.padEnd(20)} offset=${v.offset}  ${Math.min(v.byteSize,32)}B\x1b[0m`);
              });
            });

            if (layout.unpackedSlots.length > 0) {
              term.writeln(`\x1b[1;33m  ⚠ ${layout.unpackedSlots.length} slot(s) have unused space. Reorder variables to pack tighter.\x1b[0m`);
            } else {
              term.writeln('\x1b[1;32m  ✔ Slot packing is optimal.\x1b[0m');
            }
          } catch (e: any) {
            term.writeln(`\x1b[1;31m✖ Storage analysis failed:\x1b[0m ${e.message}`);
          }
          break;
        }

        // ── test <addr> <fn> [args...] ────────────────────────────────────────
        case 'test': {
          if (args.length < 2) {
            term.writeln('\x1b[1;31m✖ Usage:\x1b[0m test <contractAddress> <functionName> [args...]');
            term.writeln('  Example: test 0xabc... getValue');
            term.writeln('  Example: test 0xabc... balanceOf 0xdef...');
            break;
          }
          const addr = args[0];
          const fnName = args[1];
          const fnArgs = args.slice(2);

          const res = stateRef.current.compileResult;
          if (!res || !res.success || !res.abi) {
            term.writeln('\x1b[1;31m✖ No compiled ABI.\x1b[0m Run \x1b[1;32mcompile\x1b[0m first.');
            break;
          }

          const abi: any[] = Array.isArray(res.abi) ? res.abi : [];
          const fn = abi.find((item: any) => item.type === 'function' && item.name === fnName);
          if (!fn) {
            term.writeln(`\x1b[1;31m✖ Function "${fnName}" not found in ABI.\x1b[0m Use \x1b[1;32mabi\x1b[0m to list available functions.`);
            break;
          }

          term.writeln(`Calling \x1b[1;32m${fnName}\x1b[0m on \x1b[90m${addr}\x1b[0m...`);
          try {
            const { Interface } = await import('ethers');
            const iface = new Interface(abi);

            // Basic type coercion for args
            const processedArgs = (fn.inputs || []).map((input: any, i: number) => {
              const raw = fnArgs[i] || '';
              if (input.type.includes('uint') || input.type.includes('int')) {
                try { return BigInt(raw); } catch { return 0n; }
              }
              if (input.type === 'bool') return raw.toLowerCase() === 'true';
              return raw;
            });

            const data = iface.encodeFunctionData(fnName, processedArgs);
            const { returnValue, gasUsed } = await browserVM.runCall(addr, data);

            if (!returnValue || returnValue === '0x') {
              term.writeln('\x1b[33m⚠ Empty return (0x). Function may be write-only or contract not at this address.\x1b[0m');
              break;
            }

            const decoded = iface.decodeFunctionResult(fnName, returnValue);
            const outputTypes = (fn.outputs || []).map((o: any) => o.type);

            section(`Result: ${fnName}`);
            decoded.forEach((val: any, i: number) => {
              const type = outputTypes[i] || '?';
              const formatted = typeof val === 'bigint'
                ? val.toString()
                : Array.isArray(val) || (typeof val === 'object' && val !== null)
                  ? JSON.stringify(val, (_k, v) => typeof v === 'bigint' ? v.toString() : v)
                  : String(val);
              term.writeln(`  [${i}] \x1b[90m${type}\x1b[0m  →  \x1b[1;33m${formatted}\x1b[0m`);
            });
            term.writeln(`  Gas used: \x1b[90m${gasUsed.toLocaleString()}\x1b[0m`);
          } catch (e: any) {
            term.writeln(`\x1b[1;31m✖ Call failed:\x1b[0m ${e.message}`);
          }
          break;
        }

        // ── scan / audit ──────────────────────────────────────────────────────
        case 'scan':
        case 'audit': {
          term.writeln('Running Security Radar audit...');
          const auditCode = stateRef.current.activeFileCode;
          if (!auditCode) {
            term.writeln('\x1b[1;31m✖ Code is empty.\x1b[0m Open a Solidity file first.');
            break;
          }
          try {
            const report = stateRef.current.securityReport ?? scanContract(auditCode);
            const isCached = !!stateRef.current.securityReport;
            const isStale = isCached && stateRef.current.lastCompiledSource !== auditCode;
            const source = isCached ? 'cached' : 'live scan';

            section('Security Radar Report');
            term.writeln(`\x1b[90m  Source: ${source}\x1b[0m`);
            if (isStale) {
              term.writeln('\x1b[1;33m  ⚠ Warning: code has changed since last compile\x1b[0m');
            }
            term.writeln(`  Safety Score : \x1b[1;${report.score > 80 ? '32' : report.score > 50 ? '33' : '31'}m${report.score}/100\x1b[0m`);
            term.writeln(`  Findings     : \x1b[1;31m${report.summary.high + report.summary.critical} High\x1b[0m  \x1b[1;33m${report.summary.medium} Medium\x1b[0m  \x1b[1;36m${report.summary.low} Low\x1b[0m`);

            if (report.findings.length > 0) {
              term.writeln('');
              report.findings.forEach((f) => {
                const col = f.severity === 'High' ? '\x1b[1;31m' : f.severity === 'Medium' ? '\x1b[1;33m' : '\x1b[1;36m';
                term.writeln(`  ${col}[${f.severity}][Conf: ${f.confidence || 'High'}]\x1b[0m ${f.title}`);
                term.writeln(`  \x1b[90m  ${f.description}\x1b[0m`);
              });
            } else {
              term.writeln('\x1b[1;32m  ✔ 0 findings. Contract looks clean!\x1b[0m');
            }
          } catch (e: any) {
            term.writeln(`\x1b[1;31m✖ Security scan failed:\x1b[0m ${e.message}`);
          }
          break;
        }

        // ── unknown ───────────────────────────────────────────────────────────
        default:
          term.writeln(`\x1b[1;31maethon: command not found:\x1b[0m ${command}. Type \x1b[1;32mhelp\x1b[0m for options.`);
      }

      prompt();
    };

    // Auto-fit on window resize
    const handleResize = () => {
      try { fitAddon.fit(); } catch {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      onKeyDispose.dispose();
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="w-full h-full min-h-[140px] bg-[#151515] p-2 overflow-hidden flex flex-col">
      <div ref={terminalRef} className="w-full h-full flex-1" />
    </div>
  );
};

export default AethonTerminal;
