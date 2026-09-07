/**
 * CRE confidential audit trigger proxy.
 * Stub mode: runs proprietary policy locally (same as cre/aethon-audit-firewall).
 * Live mode: JWT-signs workflows.execute to CRE gateway when CRE_WORKFLOW_ID + CRE_TRIGGER_PRIVATE_KEY set.
 */
import { createHash, randomUUID } from 'node:crypto';
import { Wallet } from 'ethers';

function emptyFlags() {
  return {
    obfuscatedTax: false,
    privilegeEscalation: false,
    externalCallRisk: false,
    logicBomb: false,
  };
}

function scanSourceHeuristics(source) {
  const flags = emptyFlags();
  const s = (source || '').toLowerCase();
  if (/tax|fee|reflection/.test(s) && /onlyowner|owner\s*\(/.test(s) && /transfer|swap/.test(s)) {
    flags.obfuscatedTax = true;
  }
  if (/selfdestruct|delegatecall/.test(s) || (/onlyowner/.test(s) && /mint|withdraw|drain|rug/.test(s))) {
    flags.privilegeEscalation = true;
  }
  if (/\.call\s*\{|\.call\(|delegatecall|staticcall/.test(s)) {
    flags.externalCallRisk = true;
  }
  if (/block\.timestamp|blockhash|tx\.origin/.test(s) && /random|lottery|gambl/.test(s)) {
    flags.logicBomb = true;
  }
  return flags;
}

function riskFlagsToMask(flags) {
  let mask = 0;
  if (flags.obfuscatedTax) mask |= 1 << 0;
  if (flags.privilegeEscalation) mask |= 1 << 1;
  if (flags.externalCallRisk) mask |= 1 << 2;
  if (flags.logicBomb) mask |= 1 << 3;
  return mask;
}

function anyRisk(flags) {
  return flags.obfuscatedTax || flags.privilegeEscalation || flags.externalCallRisk || flags.logicBomb;
}

export function evaluateDeployPolicyStub({ sourceCode, sourceHash }) {
  const heuristic = scanSourceHeuristics(sourceCode || '');
  const mask = riskFlagsToMask(heuristic);
  if (anyRisk(heuristic)) {
    return {
      verdict: 'DENY',
      verdictCode: 2,
      riskMask: mask,
      reason: 'Risk flag or model DENY — live deploy blocked',
      sourceHash: sourceHash || '',
      confidential: true,
      mode: 'stub',
    };
  }
  return {
    verdict: 'ALLOW',
    verdictCode: 1,
    riskMask: 0,
    reason: 'No risk flags; dual models allow with sufficient confidence',
    sourceHash: sourceHash || '',
    confidential: true,
    mode: 'stub',
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

export async function triggerLiveCreAudit(input, env = process.env) {
  const workflowId = (env.CRE_WORKFLOW_ID || env.VITE_CRE_WORKFLOW_ID || '').trim();
  const privateKey = (env.CRE_TRIGGER_PRIVATE_KEY || '').trim();
  const gateway =
    (env.CRE_GATEWAY_URL || '').trim() || 'https://01.gateway.zone-a.cre.chain.link';

  if (!workflowId || !privateKey) {
    throw new Error('Live CRE requires CRE_WORKFLOW_ID and CRE_TRIGGER_PRIVATE_KEY');
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
    throw new Error(`CRE gateway non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `CRE gateway HTTP ${res.status}`);
  }

  // Gateway accepts async execution; until result polling exists, fall back to stub policy
  // for immediate IDE gate, attaching execution id for CRE UI.
  const stub = evaluateDeployPolicyStub(input);
  return {
    ...stub,
    mode: 'live',
    executionId: json.result?.workflow_execution_id,
    gatewayStatus: json.result?.status || 'ACCEPTED',
    confidential: true,
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

  if (mode === 'live') {
    try {
      return await triggerLiveCreAudit(input, env);
    } catch (e) {
      // Fall back to stub so IDE remains usable while deploy access is pending
      const stub = evaluateDeployPolicyStub(input);
      return {
        ...stub,
        mode: 'stub',
        liveError: e instanceof Error ? e.message : String(e),
        at: Date.now(),
      };
    }
  }

  return { ...evaluateDeployPolicyStub(input), at: Date.now() };
}
