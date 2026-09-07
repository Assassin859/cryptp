/**
 * Aethon CRE Confidential Audit Firewall — Continuity entry.
 *
 * Shape (Chainlink Confidential Workflows):
 * 1. Cron/HTTP trigger → handlerInTee (Nitro us-west-2)
 * 2. runtime.getSecret inside TEE
 * 3. Proprietary deploy policy (evaluateDeployPolicy) over source
 * 4. usingTheDons() — only verdict + riskMask (+ sourceHash) leave the enclave
 *
 * DON report ABI must match AuditFirewallConsumer.onReport:
 *   abi.encode(uint8 verdictCode, uint8 riskMask, bytes32 sourceHash, uint64 chainSelector)
 */
import {
	cre,
	hexToBase64,
	type TeeRuntime,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, keccak256, parseAbiParameters, toBytes } from 'viem'
import { z } from 'zod'
import { evaluateDeployPolicy, verdictToCode } from './src/policy.ts'

export const configSchema = z.object({
	schedule: z.string(),
	secretId: z.string(),
	/** Demo Solidity excerpt for cron simulate (IDE uses HTTP payload in prod). */
	sampleSource: z.string(),
	/** Prefer 32-byte hex; if invalid/missing, keccak256(sampleSource) is used for the report. */
	sampleSourceHash: z.string().optional(),
	network: z.string().optional(),
	/** Chain selector passed to AuditFirewallConsumer.onReport (0 = unset / staging). */
	chain_selector: z.number().optional(),
})
type Config = z.infer<typeof configSchema>

/** Resolve bytes32 sourceHash for consumer-compatible report encoding. */
export function resolveSourceHashBytes32(source: string, maybeHash?: string): `0x${string}` {
	const bare = (maybeHash || '').trim().replace(/^0x/i, '')
	if (/^[0-9a-fA-F]{64}$/.test(bare)) {
		return `0x${bare.toLowerCase()}`
	}
	return keccak256(toBytes(source))
}

/**
 * TEE callback: secrets + proprietary policy stay in the enclave.
 * Only the verdict crosses back via usingTheDons().
 */
export const onCronTrigger = (runtime: TeeRuntime<Config>): string => {
	const config = runtime.config

	// Step 2 — Vault DON secret released only into attested enclave
	const apiToken = runtime.getSecret({ id: config.secretId }).result().value
	// Never log the token. Touch it so the simulator proves injection.
	if (!apiToken) {
		throw new Error('Missing enclave secret')
	}

	const sourceHashHex = resolveSourceHashBytes32(config.sampleSource, config.sampleSourceHash)

	// Step 3 — proprietary policy over source (staging: local heuristics;
	// production can add HTTPClient LLM/scanner calls with the secret).
	const result = evaluateDeployPolicy({
		sourceCode: config.sampleSource,
		sourceHash: sourceHashHex,
		network: config.network ?? 'sepolia',
	})

	// Simulation-only log — remove before production deploy
	runtime.log(`Enclave audit complete. verdict=${result.verdict}`)

	// Step 4 — cross back; ABI matches AuditFirewallConsumer.onReport
	const donRuntime = runtime.usingTheDons()
	const riskMaskU8 = Math.min(255, Math.max(0, result.riskMask | 0))
	const encodedPayload = encodeAbiParameters(
		parseAbiParameters('uint8 verdictCode, uint8 riskMask, bytes32 sourceHash, uint64 chainSelector'),
		[
			verdictToCode(result.verdict),
			riskMaskU8,
			sourceHashHex,
			BigInt(config.chain_selector ?? 0),
		],
	)

	donRuntime
		.report({
			encodedPayload: hexToBase64(encodedPayload),
			encoderName: 'evm',
			signingAlgo: 'ecdsa',
			hashingAlgo: 'keccak256',
		})
		.result()

	return `${result.verdict} (verdictCode: ${verdictToCode(result.verdict)}, riskMask: ${result.riskMask}, reason: ${result.reason})`
}

export function initWorkflow(config: Config) {
	const cronTrigger = new cre.capabilities.CronCapability()

	return [
		cre.handlerInTee(cronTrigger.trigger({ schedule: config.schedule }), onCronTrigger, [
			{ tee: 'nitro', regions: ['us-west-2'] },
		]),
	]
}
