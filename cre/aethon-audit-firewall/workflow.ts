/**
 * Aethon CRE Confidential Audit Firewall — Continuity entry.
 *
 * Shape (Chainlink Confidential Workflows):
 * 1. Cron trigger → sampleSource (simulate / evidence only)
 *    HTTP trigger → IDE payload sourceCode/sourceHash (live gate)
 * 2. runtime.getSecret inside TEE
 * 3. Proprietary deploy policy (evaluateDeployPolicy) over source
 * 4. usingTheDons() — only verdict + riskMask (+ sourceHash) leave the enclave
 *
 * DON report ABI must match AuditFirewallConsumer.onReport:
 *   abi.encode(uint8 verdictCode, uint8 riskMask, bytes32 sourceHash, uint64 chainSelector)
 */
import {
	cre,
	decodeJson,
	hexToBase64,
	type HTTPPayload,
	type TeeRuntime,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, keccak256, parseAbiParameters, toBytes } from 'viem'
import { z } from 'zod'
import { evaluateDeployPolicy, verdictToCode } from './src/policy.ts'

const authorizedKeySchema = z.union([
	z.string().min(1),
	z.object({
		type: z.string().optional(),
		publicKey: z.string().min(1),
	}),
])

export const configSchema = z.object({
	schedule: z.string(),
	secretId: z.string(),
	/** Demo Solidity excerpt for cron simulate only (not the live IDE path). */
	sampleSource: z.string(),
	/** Prefer 32-byte hex; if invalid/missing, keccak256(sampleSource) is used for the report. */
	sampleSourceHash: z.string().optional(),
	network: z.string().optional(),
	/** Chain selector passed to AuditFirewallConsumer.onReport (0 = unset / staging). */
	chain_selector: z.number().optional(),
	http_trigger: z
		.object({
			enabled: z.boolean().optional(),
			authorizedKeys: z.array(authorizedKeySchema).optional(),
		})
		.optional(),
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

function reportDeployVerdict(
	runtime: TeeRuntime<Config>,
	sourceCode: string,
	sourceHashHex: `0x${string}`,
	network: string,
): string {
	const config = runtime.config
	const result = evaluateDeployPolicy({
		sourceCode,
		sourceHash: sourceHashHex,
		network,
	})

	runtime.log(`Enclave audit complete. verdict=${result.verdict}`)

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

function requireEnclaveSecret(runtime: TeeRuntime<Config>): void {
	const apiToken = runtime.getSecret({ id: runtime.config.secretId }).result().value
	if (!apiToken) {
		throw new Error('Missing enclave secret')
	}
}

/**
 * Cron / simulate path: audits config.sampleSource only.
 * Live IDE audits must use the HTTP trigger.
 */
export const onCronTrigger = (runtime: TeeRuntime<Config>): string => {
	requireEnclaveSecret(runtime)
	const config = runtime.config
	const sourceHashHex = resolveSourceHashBytes32(config.sampleSource, config.sampleSourceHash)
	return reportDeployVerdict(
		runtime,
		config.sampleSource,
		sourceHashHex,
		config.network ?? 'sepolia',
	)
}

type IdeAuditInput = {
	sourceCode?: string
	sourceHash?: string
	network?: string
	contractAddress?: string
	abiHint?: string
}

/**
 * Live IDE path: audits HTTP trigger payload (sourceCode + sourceHash from cre-proxy).
 */
export const onHttpTrigger = (runtime: TeeRuntime<Config>, payload: HTTPPayload): string => {
	requireEnclaveSecret(runtime)

	if (!payload.input || payload.input.length === 0) {
		throw new Error('HTTP audit payload is empty; expected IDE sourceCode + sourceHash')
	}

	const input = decodeJson(payload.input) as IdeAuditInput
	const sourceCode = typeof input.sourceCode === 'string' ? input.sourceCode : ''
	const sourceHash = typeof input.sourceHash === 'string' ? input.sourceHash : ''
	if (!sourceCode.trim() || !sourceHash.trim()) {
		throw new Error('HTTP audit requires non-empty sourceCode and sourceHash')
	}

	const sourceHashHex = resolveSourceHashBytes32(sourceCode, sourceHash)
	return reportDeployVerdict(
		runtime,
		sourceCode,
		sourceHashHex,
		input.network || runtime.config.network || 'sepolia',
	)
}

function httpAuthorizedKeys(config: Config): { type: 'KEY_TYPE_ECDSA_EVM'; publicKey: string }[] {
	const keys = config.http_trigger?.authorizedKeys ?? []
	return keys.map((k) => {
		if (typeof k === 'string') {
			return { type: 'KEY_TYPE_ECDSA_EVM' as const, publicKey: k }
		}
		return {
			type: 'KEY_TYPE_ECDSA_EVM' as const,
			publicKey: k.publicKey,
		}
	})
}

export function initWorkflow(config: Config) {
	const cronTrigger = new cre.capabilities.CronCapability()
	// Cron (index 0) = simulate / sampleSource. HTTP = live IDE payload.
	const cronHandler = cre.handlerInTee(cronTrigger.trigger({ schedule: config.schedule }), onCronTrigger, [
		{ tee: 'nitro', regions: ['us-west-2'] },
	])

	const httpEnabled = config.http_trigger?.enabled !== false
	if (!httpEnabled) {
		return [cronHandler]
	}

	const httpTrigger = new cre.capabilities.HTTPCapability()
	const httpHandler = cre.handlerInTee(
		httpTrigger.trigger({
			authorizedKeys: httpAuthorizedKeys(config),
		}),
		onHttpTrigger,
		[{ tee: 'nitro', regions: ['us-west-2'] }],
	)

	// Mixed trigger Payload types — Workflow allows heterogeneous handler entries.
	return [cronHandler, httpHandler] as const
}
