import express from 'express';
import cors from 'cors';
import solc from 'solc';
import { resolveImports } from './resolveImports.mjs';
import { handleCreAuditRequest, handleCreExecutionPoll } from './cre-proxy.mjs';

const app = express();
const port = Number(process.env.PORT || 3001);

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function parseCorsOrigins() {
  const raw = (process.env.CRE_CORS_ORIGINS || '').trim();
  if (!raw) return DEFAULT_CORS_ORIGINS;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const allowedOrigins = new Set(parseCorsOrigins());

app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, health checks) send no Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      return callback(null, false);
    },
  })
);
app.use(express.json({ limit: '2mb' }));

function extractCreAuditToken(req) {
  const header = req.get('authorization') || '';
  const bearer = /^Bearer\s+(.+)$/i.exec(header);
  if (bearer) return bearer[1].trim();
  const alt = req.get('x-cre-audit-token');
  return alt ? String(alt).trim() : '';
}

function requireCreAuditAuth(req, res, next) {
  const expected = (process.env.CRE_AUDIT_TOKEN || '').trim();
  if (!expected) return next();
  const got = extractCreAuditToken(req);
  if (got && got === expected) return next();
  return res.status(401).json({ error: 'Unauthorized — missing or invalid CRE audit token' });
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    cre: {
      stub: true,
      liveReady: Boolean(process.env.CRE_WORKFLOW_ID && process.env.CRE_TRIGGER_PRIVATE_KEY),
      authRequired: Boolean((process.env.CRE_AUDIT_TOKEN || '').trim()),
      corsOrigins: [...allowedOrigins],
    },
  });
});

/** CRE Confidential audit gate — stub by default; live when CRE_* env set */
app.post('/cre/audit', requireCreAuditAuth, async (req, res) => {
  try {
    const result = await handleCreAuditRequest(req.body || {}, process.env);
    res.json(result);
  } catch (e) {
    const status = typeof e?.statusCode === 'number' ? e.statusCode : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

/** Live CRE execution poll groundwork (pending until verdict wiring exists). */
app.get('/cre/audit/execution/:executionId', requireCreAuditAuth, (req, res) => {
  try {
    const result = handleCreExecutionPoll(req.params.executionId);
    res.json(result);
  } catch (e) {
    const status = typeof e?.statusCode === 'number' ? e.statusCode : 500;
    res.status(status).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

app.post('/compile', async (req, res) => {
  const { sourceCode, contractName, projectFiles } = req.body;

  if (!sourceCode) {
    return res.status(400).json({ error: 'Missing sourceCode' });
  }

  const activeFileName = req.body.activeFileName || 'contract.sol';

  let baseSources = {
    [activeFileName]: {
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
          '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode.object', 'evm.deployedBytecode.sourceMap'],
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

    const activeFileName = req.body.activeFileName || 'contract.sol';
    const contracts = output.contracts[activeFileName] || output.contracts[Object.keys(output.contracts || {})[0]];
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
      deployedBytecode: contract.evm.deployedBytecode?.object,
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
