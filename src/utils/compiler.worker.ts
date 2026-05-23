/**
 * CryptP Browser Compiler WebWorker
 * Handles Solc-WASM compilation in a background thread to prevent UI freezing.
 * Bypasses NPM solc to dynamically load lightweight WASM binary natively.
 */

let compileStandard: any = null;
let currentVersion: string = '0.8.20';

const DEFAULT_SOLJSON = 'https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js';

const setupSolcSafe = (mod: any) => {
  // Directly bind solidity_compile using ccall to bypass cwrap entirely if needed
  return {
    compile: (input: string) => {
       const cw = mod.cwrap || (self as any).cwrap;
       if (cw) {
           const sc = cw('solidity_compile', 'string', ['string', 'number']);
           return sc(input, 0);
       }
       // Fallback to ccall
       return (self as any).ccall('solidity_compile', 'string', ['string', 'number'], [input, 0]);
    }
  };
};

const loadCompiler = async (url: string = DEFAULT_SOLJSON): Promise<void> => {
  if (compileStandard && (self as any)._lastLoadedUrl === url) return;
  
  return new Promise(async (resolve, reject) => {
    const controller = new AbortController();
    const timeoutSignal = setTimeout(() => controller.abort(), 15000); 

    try {
      if (compileStandard) {
        console.log('[Worker] Clearing previous compiler instance...');
        compileStandard = null;
      }
      
      console.log(`[Worker] Environment: Lockdown/SES Compatibility Mode.`);
      console.log(`[Worker] Fetching binary: ${url}`);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutSignal);

      if (!response.ok) throw new Error(`HTTP Error: ${response.statusText}`);
      const text = await response.text();

      // Lockdown Compatibility: Pre-defining Module prevents the script from failing 
      // when it tries to 'var Module = Module || {}' on a frozen global scope.
      (self as any).Module = (self as any).Module || {};
      
      console.log('[Worker] Executing binary in protected scope...');
      try {
        // SES/Lockdown Closure Breaking: wrap the binary in a self-executing function 
        // that captures any internal 'var Module' or 'Module' declarations and 
        // forces them onto the global self.Module.
        const wrapper = `
          (function() {
            var Module = self.Module;
            ${text}
            if (typeof Module !== 'undefined' && Module !== self.Module) {
               Object.assign(self.Module, Module);
            }
          })();
        `;
        const executor = new Function(wrapper);
        executor.call(self);
        console.log('[Worker] Script execution passed.');
      } catch (e: any) {
        console.error(`[Worker] Execution failed: ${e.message}`);
        throw new Error(`Script Error: ${e.message}`);
      }

      // WASM instantiation in restricted environments can be slower. 
      // We give it a generous 'settle' delay before starting the probe.
      await new Promise(r => setTimeout(r, 2000));

      const getModule = () => {
        const targets = [
          (self as any).Module,
          (self as any).solc,
          self
        ];

        for (const mod of targets) {
          if (!mod) continue;
          // Look for any standard solc entry point
          const entry = mod._solidity_compile || mod.solidity_compile || mod.compileStandard;
          if (entry) {
             console.log(`[Worker] Entry point detected on: ${mod === self ? 'self' : 'Module'}`);
             return { ...mod, _solidity_compile: entry };
          }
        }
        return null;
      };

      const checkModule = () => {
        const mod = getModule();
        if (mod && mod._solidity_compile) { 
          console.log('[Worker] Solidity compiler discovered and bound.');
          compileStandard = setupSolcSafe(mod).compile;
          (self as any)._lastLoadedUrl = url;
          resolve();
          return true;
        }
        return false;
      };

      if (!checkModule()) {
        console.log('[Worker] Module initializing (Interactive Probe Mode)...');
        const interval = setInterval(() => {
          if (checkModule()) clearInterval(interval);
        }, 500);
        
        // 40s timeout for extremely throttled virtual environments
        setTimeout(() => {
          clearInterval(interval);
          if (!compileStandard) {
             const keys = Object.keys(self).filter(k => k.length < 30).slice(0, 30);
             console.error('[Worker] Initialization timed out (40s).');
             console.error(`[Worker] Found Global Keys: ${keys.join(', ')}`);
             reject(new Error('Compiler failed to initialize. Environmental policy restricted function binding.'));
          }
        }, 40000);
      }

    } catch (err: any) {
      clearTimeout(timeoutSignal);
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort ? 'Network timeout (15s)' : err.message;
      console.error(`[Worker] Load Error: ${errorMsg}`);
      reject(new Error(errorMsg));
    }
  });
};

self.onmessage = async (event) => {
  const { type, versionUrl, sourceCode, contractName, projectFiles, activeFileName = 'contract.sol' } = event.data;
  
  if (type === 'LOAD_VERSION') {
    try {
      await loadCompiler(versionUrl);
      self.postMessage({ success: true, type: 'VERSION_LOADED', version: versionUrl });
    } catch (err: any) {
      self.postMessage({ success: false, type: 'VERSION_LOAD_FAILED', error: err.message });
    }
    return;
  }

  try {
    if (!compileStandard) {
      await loadCompiler();
    }

    const sources: Record<string, { content: string }> = {
      [activeFileName]: { content: sourceCode }
    };
    
    if (projectFiles) {
       projectFiles.forEach((f: any) => {
          sources[f.name] = { content: f.content };
       });
    }

    const input = {
      language: 'Solidity',
      sources: sources,
      settings: {
        outputSelection: {
          '*': {
            '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode.sourceMap']
          }
        },
        optimizer: { enabled: true, runs: 200 }
      }
    };

    // We pass our JSON directly. Import callbacks via standard JSON are not strictly supported by the bare `solidity_compile(input, 0)`.
    // Remote imports should be flattened prior to compilation by hardhatCompiler.
    const outputString = compileStandard(JSON.stringify(input));
    const output = JSON.parse(outputString);

    if (output.errors) {
       const errors = output.errors.map((e: any) => {
          let lineNum = e.sourceLocation?.start;
          
          if (e.sourceLocation && e.sourceLocation.file && e.sourceLocation.start !== -1 && e.sourceLocation.start !== undefined) {
             const fileContent = sources[e.sourceLocation.file]?.content;
             if (fileContent) {
                 const textBeforeError = fileContent.substring(0, e.sourceLocation.start);
                 lineNum = textBeforeError.split('\n').length;
             }
          }

          return {
            type: e.severity,
            message: e.message,
            sourceLocation: {
               file: e.sourceLocation?.file,
               start: lineNum,
               end: e.sourceLocation?.end
            }
          };
       });
       
       if (errors.some((e: any) => e.type === 'error')) {
          self.postMessage({ success: false, errors });
          return;
       }
    }

    const contractFiles = Object.keys(output.contracts || {});
    const mainFile = contractFiles.find(f => Object.keys(output.contracts[f]).includes(contractName)) || contractFiles[0];
    
    if (!mainFile || !output.contracts[mainFile]) {
       self.postMessage({ success: false, errors: [{ type: 'error', message: `Contract ${contractName} not found after compilation.` }] });
       return;
    }

    const contractResult = output.contracts[mainFile];
    const contract = contractResult[contractName] || Object.values(contractResult)[0];

    if (!contract) {
       self.postMessage({ success: false, errors: [{ type: 'error', message: `Contract ${contractName} not found in output.` }] });
       return;
    }

    self.postMessage({
      success: true,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      sourceMap: contract.evm.deployedBytecode?.sourceMap,
      errors: output.errors || []
    });

  } catch (err: any) {
    self.postMessage({ success: false, errors: [{ type: 'error', message: err.message }] });
  }
};
