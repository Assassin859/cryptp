/**
 * CRE confidential audit trigger proxy.
 * Stub mode: runs proprietary policy locally (same as cre/shared/deployPolicy.mjs).
 * Live mode: JWT-signs workflows.execute to CRE gateway when CRE_WORKFLOW_ID + CRE_TRIGGER_PRIVATE_KEY set.
 * Live never fabricates a local verdict labeled as "live".
 */
import { createHash, randomUUID } from 'node:crypto';
import { Wallet } from 'ethers';
import {
  evaluateDeployPolicy,
  verdictToCode,
} from './cre/shared/deployPolicy.mjs';

/** Normalize hex hash (strip 0x, lowercase). */
export function normalizeContentHash(hash) {
  return String(hash || '')
    .trim()
    .replace(/^0x/i, '')
    .toLowerCase();
}

export function sha256HexUtf8(text) {
  return createHash('sha256').update(String(text ?? ''), 'utf8').digest('hex');
}

/**
 * Reject audits where client hash does not match source body (gate-bypass fix).
 */
export function assertSourceHashBinding(sourceCode, sourceHash) {
  const expected = sha256HexUtf8(sourceCode);
  const got = normalizeContentHash(sourceHash);
  if (!got) {
    const err = new Error('Missing sourceHash');
    err.statusCode = 400;
    err.code = 'hash_mismatch';
    throw err;
  }
  if (expected !== got) {
    const err = new Error(
      'sourceHash does not match sha256(sourceCode). Recompile and audit the compiled source only.'
    );
    err.statusCode = 400;
    err.code = 'hash_mismatch';
    throw err;
  }
  return expected;
}

export function evaluateDeployPolicyStub(input) {
  const result = evaluateDeployPolicy({
    sourceCode: input?.sourceCode || '',
    sourceHash: input?.sourceHash || '',
    contractAddress: input?.contractAddress,
    network: input?.network,
    primaryRecommendation: input?.primaryRecommendation,
    secondaryRecommendation: input?.secondaryRecommendation,
    primaryConfidence: input?.primaryConfidence,
    secondaryConfidence: input?.secondaryConfidence,
  });
  return {
    verdict: result.verdict,
    verdictCode: verdictToCode(result.verdict),
    riskMask: result.riskMask,
    reason: result.reason,
    sourceHash: input?.sourceHash || '',
    confidential: false,
    mode: 'stub',
    confidence: result.confidence,
  };
}

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) {
      out[k] = sortKeysDeep(value[k]);
    }
    return out;
  }
  return value;
}

function base64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/**
 * Build CRE HTTP trigger JWT (alg ETH) per Chainlink docs.
 */
export async function createCreRequestJwt(requestBody, privateKey) {
  const wallet = new Wallet(privateKey);
  const sorted = sortKeysDeep(requestBody);
  const bodyStr = JSON.stringify(sorted);
  const digest = '0x' + createHash('sha256').update(bodyStr, 'utf8').digest('hex');
  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: 'ETH', typ: 'JWT' };
  const payload = {
    digest,
    iss: wallet.address,
    iat,
    exp: iat + 300,
    jti: randomUUID(),
  };
  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;
  const sigHex = await wallet.signMessage(message);
  const sigBytes = Buffer.from(sigHex.slice(2), 'hex');
  const signatureB64 = base64Url(sigBytes);
  return {
    jwt: `${headerB64}.${payloadB64}.${signatureB64}`,
    bodyStr,
    address: wallet.address,
  };
}

/**
 * Trigger CRE workflow. Returns accepted/pending — never a fabricated local verdict as "live".
 */
export async function triggerLiveCreAudit(input, env = process.env) {
  const workflowId = (env.CRE_WORKFLOW_ID || env.VITE_CRE_WORKFLOW_ID || '').trim();
  const privateKey = (env.CRE_TRIGGER_PRIVATE_KEY || '').trim();
  const gateway =
    (env.CRE_GATEWAY_URL || '').trim() || 'https://01.gateway.zone-a.cre.chain.link';

  if (!workflowId || !privateKey) {
    const err = new Error('Live CRE requires CRE_WORKFLOW_ID and CRE_TRIGGER_PRIVATE_KEY');
    err.statusCode = 503;
    throw err;
  }

  const requestBody = {
    id: randomUUID(),
    jsonrpc: '2.0',
    method: 'workflows.execute',
    params: {
      input: {
        sourceCode: input.sourceCode,
        sourceHash: input.sourceHash,
        contractAddress: input.contractAddress,
        network: input.network || 'sepolia',
        abiHint: input.abiHint,
      },
      workflow: { workflowID: workflowId },
    },
  };

  const { jwt, bodyStr } = await createCreRequestJwt(requestBody, privateKey);
  const res = await fetch(gateway, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: bodyStr,
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const err = new Error(`CRE gateway non-JSON (${res.status}): ${text.slice(0, 200)}`);
    err.statusCode = 502;
    throw err;
  }

  if (!res.ok || json.error) {
    const err = new Error(json.error?.message || `CRE gateway HTTP ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  return {
    mode: 'accepted',
    verdict: null,
    verdictCode: 0,
    riskMask: 0,
    reason:
      'CRE workflow accepted. Verdict polling is not wired yet — switch to Stub/staging for a gateable local policy result, or wait for execution result support.',
    sourceHash: input.sourceHash || '',
    executionId: json.result?.workflow_execution_id,
    gatewayStatus: json.result?.status || 'ACCEPTED',
    confidential: true,
    gateable: false,
    at: Date.now(),
  };
}

export async function handleCreAuditRequest(body, env = process.env) {
  const mode = body?.mode === 'live' || env.CRE_FORCE_LIVE === '1' ? 'live' : 'stub';
  const input = {
    sourceCode: body?.sourceCode || '',
    sourceHash: body?.sourceHash || '',
    contractAddress: body?.contractAddress,
    network: body?.network,
    abiHint: body?.abiHint,
  };

  const boundHash = assertSourceHashBinding(input.sourceCode, input.sourceHash);
  input.sourceHash = boundHash;

  if (mode === 'live') {
    // Fail closed — do not silently return stub on live errors.
    return await triggerLiveCreAudit(input, env);
  }

  return { ...evaluateDeployPolicyStub(input), gateable: true, at: Date.now() };
}
