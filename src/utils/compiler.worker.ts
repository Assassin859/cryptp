/**
 * CryptP Browser Compiler WebWorker
 * ---------------------------------
 * Handles Solc-WASM compilation in a background thread to prevent UI freezing.
 * Supports recursive import resolution for OpenZeppelin and other remote contracts.
 */

import solc from 'solc';

let compiler: any = null;

// The Soljson.js binary version to use (0.8.28 is a very stable recent version)
const SOLJSON_URL = 'https://bin.soliditylang.org/bin/soljson-v0.8.28+commit.7893614a.js';

/**
 * Load the Solc binary from CDN and initialize the wrapper.
 */
const loadCompiler = async (): Promise<void> => {
  if (compiler) return;
  
  return new Promise((resolve, reject) => {
    try {
      (self as any).importScripts(SOLJSON_URL);
      
      const checkModule = () => {
        const solcModule = (self as any).Module;
        if (solcModule) {
          compiler = solc.setupMethods(solcModule);
          resolve();
          return true;
        }
        return false;
      };

      if (!checkModule()) {
        const interval = setInterval(() => {
          if (checkModule()) clearInterval(interval);
        }, 100);
        
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Compiler loading timed out.'));
        }, 30000);
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Main compilation event listener.
 */
self.onmessage = async (event) => {
  const { sourceCode, contractName, projectFiles } = event.data;
  
  try {
    if (!compiler) {
      await loadCompiler();
    }

    const sources: Record<string, { content: string }> = {
      'contract.sol': { content: sourceCode }
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

    // Synchronous import callback (required by solc-js)
    const findImports = (path: string) => {
      if (sources[path]) {
        return { contents: sources[path].content };
      }
      // For WASM mode, we currently require all files to be in projectFiles
      // Advanced async pre-fetching can be added here later.
      return { error: 'File not found locally. Please ensure all imports are in your project.' };
    };

    const output = JSON.parse(compiler.compile(JSON.stringify(input), { import: findImports }));

    if (output.errors) {
       const errors = output.errors.map((e: any) => ({
          type: e.severity,
          message: e.message,
          sourceLocation: e.sourceLocation
       }));
       
       if (errors.some((e: any) => e.type === 'error')) {
          self.postMessage({ success: false, errors });
          return;
       }
    }

    // Handle multiple contracts in one file
    const contractResult = output.contracts['contract.sol'] || output.contracts[Object.keys(output.contracts)[0]];
    const contract = contractResult[contractName] || contractResult[Object.keys(contractResult)[0]];

    if (!contract) {
       self.postMessage({ success: false, errors: [{ type: 'error', message: `Contract ${contractName} not found.` }] });
       return;
    }

    self.postMessage({
      success: true,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      sourceMap: contract.evm.deployedBytecode?.sourceMap,
      errors: output.errors
    });

  } catch (err: any) {
    self.postMessage({ success: false, errors: [{ type: 'error', message: err.message }] });
  }
};
