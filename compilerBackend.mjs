import express from 'express';
import cors from 'cors';
import solc from 'solc';
import { resolveImports } from './resolveImports.mjs';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/compile', async (req, res) => {
  const { sourceCode, contractName, projectFiles } = req.body;

  if (!sourceCode) {
    return res.status(400).json({ error: 'Missing sourceCode' });
  }

  let baseSources = {
    'contract.sol': {
      content: sourceCode,
    },
  };

  if (projectFiles) {
    projectFiles.forEach(f => {
       baseSources[f.name] = { content: f.content };
    });
  }

  const resolvedSources = await resolveImports(baseSources);

  const input = {
    language: 'Solidity',
    sources: resolvedSources,
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode.sourceMap'],
        },
      },
    },
  };

  try {
    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    if (output.errors) {
      const errors = output.errors.map((e) => ({
        type: e.severity,
        message: e.message,
        sourceLocation: e.sourceLocation,
      }));

      // If there are actual errors (not just warnings), return failure
      if (errors.some((e) => e.type === 'error')) {
        return res.json({ success: false, errors });
      }
    }

    const contracts = output.contracts['contract.sol'];
    let name = contractName;
    if (!contracts[name]) {
       name = Object.keys(contracts)[0];
    }
    const contract = contracts[name];

    if (!contract) {
      return res.json({
        success: false,
        errors: [{ type: 'error', message: `Contract ${name} not found.` }],
      });
    }

    res.json({
      success: true,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      sourceMap: contract.evm.deployedBytecode?.sourceMap,
      errors: output.errors,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Compiler backend listening at http://localhost:${port}`);
});
