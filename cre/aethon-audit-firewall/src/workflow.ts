/**
 * Aethon CRE Confidential Audit Firewall workflow.
 *
 * Shape (Chainlink Confidential Workflows):
 * 1. HTTP trigger (IDE → gateway → this handler)
 * 2. cre.handlerInTee — secrets + proprietary policy inside TEE
 * 3. runtime.getSecret for scanner/LLM API keys (production)
 * 4. usingTheDons() — only verdict + riskMask leave the enclave
 * 5. Optional EVM writeReport to AuditFirewallConsumer on Sepolia
 *
 * This file is the Continuity integration target. Simulate with:
 *   cre workflow simulate ./aethon-audit-firewall --project-root ./ --target=staging-settings
 *
 * SDK imports are typed loosely so the package typechecks without the private CRE npm
 * until `cre init` / official template deps are installed in the operator environment.
 */

import {
  evaluateDeployPolicy,
  verdictToCode,
  type CreVerdict,
  type PolicyInput,
  type PolicyResult,
} from './policy.ts';

/** Payload from Aethon IDE / trigger proxy */
export interface AuditHttpInput {
  sourceCode?: string;
  sourceHash?: string;
  contractAddress?: string;
  network?: string;
  abiHint?: string;
}

export interface AuditWorkflowOutput {
  verdict: CreVerdict;
  verdictCode: number;
  riskMask: number;
  reason: string;
  sourceHash?: string;
  confidential: true;
}

type TeeRuntime = {
  getSecret: (args: { id: string }) => Promise<{ value: string }>;
  log?: (msg: string) => void;
};

type DonRuntime = {
  report: (args: { verdict: CreVerdict; riskMask: number; sourceHash?: string }) => Promise<unknown>;
};

/**
 * Confidential portion: fetch secrets inside TEE, run proprietary policy,
 * return only non-sensitive verdict fields.
 */
export async function confidentialAuditHandler(
  runtime: TeeRuntime,
  input: AuditHttpInput,
  config: {
    secrets_ids?: {
      scanner_api_key_id?: string;
      primary_llm_api_key_id?: string;
      secondary_llm_api_key_id?: string;
    };
    /** When true, attempt HTTP LLM calls (production). Staging uses local policy only. */
    useLiveModels?: boolean;
  }
): Promise<PolicyResult> {
  // Secrets are fetched inside the enclave — never logged.
  const secretIds = config.secrets_ids || {};
  if (secretIds.scanner_api_key_id) {
    await runtime.getSecret({ id: secretIds.scanner_api_key_id });
  }
  if (secretIds.primary_llm_api_key_id) {
    await runtime.getSecret({ id: secretIds.primary_llm_api_key_id });
  }
  if (secretIds.secondary_llm_api_key_id) {
    await runtime.getSecret({ id: secretIds.secondary_llm_api_key_id });
  }

  const policyInput: PolicyInput = {
    sourceCode: input.sourceCode,
    sourceHash: input.sourceHash,
    contractAddress: input.contractAddress,
    network: input.network,
  };

  // Production: HTTPClient.sendRequest to scanner + dual LLMs would fill
  // primaryRecommendation / secondaryRecommendation here using enclave secrets.
  // Staging / Continuity demo: proprietary heuristic policy alone.
  void config.useLiveModels;

  const result = evaluateDeployPolicy(policyInput);
  // Do not log secrets or full source in production TEE runs.
  runtime.log?.(`Enclave audit complete verdict=${result.verdict}`);
  return result;
}

/** Cross back to Workflow DON — only safe fields. */
export async function settleOnDon(
  donRuntime: DonRuntime,
  result: PolicyResult,
  sourceHash?: string
): Promise<AuditWorkflowOutput> {
  await donRuntime.report({
    verdict: result.verdict,
    riskMask: result.riskMask,
    sourceHash,
  });
  return {
    verdict: result.verdict,
    verdictCode: verdictToCode(result.verdict),
    riskMask: result.riskMask,
    reason: result.reason,
    sourceHash,
    confidential: true,
  };
}

/**
 * Entry used by CRE HTTP trigger + handlerInTee registration.
 *
 * Pseudocode matching Chainlink docs:
 *   cre.handlerInTee(httpTrigger, async (runtime, ...) => {
 *     const result = await confidentialAuditHandler(runtime, input, config);
 *     return runtime.usingTheDons(async (donRuntime) => settleOnDon(donRuntime, result));
 *   }, [{ tee: 'nitro', regions: ['us-west-2'] }]);
 */
export async function runAuditWorkflow(
  input: AuditHttpInput,
  opts?: { useLiveModels?: boolean }
): Promise<AuditWorkflowOutput> {
  const mockTee: TeeRuntime = {
    getSecret: async ({ id }) => ({ value: `mock-secret:${id}` }),
    log: (msg) => console.log(`[TEE] ${msg}`),
  };
  const result = await confidentialAuditHandler(mockTee, input, {
    secrets_ids: {
      scanner_api_key_id: 'scanner_api_key',
      primary_llm_api_key_id: 'primary_llm_api_key',
      secondary_llm_api_key_id: 'secondary_llm_api_key',
    },
    useLiveModels: opts?.useLiveModels,
  });
  const mockDon: DonRuntime = {
    report: async () => undefined,
  };
  return settleOnDon(mockDon, result, input.sourceHash);
}
