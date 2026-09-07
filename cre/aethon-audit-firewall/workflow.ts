/**
 * Aethon CRE Confidential Audit Firewall — Continuity entry.
 *
 * Shape (Chainlink Confidential Workflows):
 * 1. Cron/HTTP trigger → handlerInTee (Nitro us-west-2)
 * 2. runtime.getSecret inside TEE
 * 3. Proprietary deploy policy (evaluateDeployPolicy) over source
 * 4. usingTheDons() — only verdict + riskMask leave the enclave
 */
import {
	cre,
	hexToBase64,
	type TeeRuntime,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, parseAbiParameters } from 'viem'
import { z } from 'zod'
import { evaluateDeployPolicy, verdictToCode } from './src/policy.ts'

export const configSchema = z.object({
	schedule: z.string(),
	secretId: z.string(),
	/** Demo Solidity excerpt for cron simulate (IDE uses HTTP payload in prod). */
	sampleSource: z.string(),
	sampleSourceHash: z.string().optional(),
	network: z.string().optional(),
})
type Config = z.infer<typeof configSchema>

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

	// Step 3 — proprietary policy over source (staging: local heuristics;
	// production can add HTTPClient LLM/scanner calls with the secret).
	const result = evaluateDeployPolicy({
		sourceCode: config.sampleSource,
		sourceHash: config.sampleSourceHash,
		network: config.network ?? 'sepolia',
	})

	// Simulation-only log — remove before production deploy
	runtime.log(`Enclave audit complete. verdict=${result.verdict}`)

	// Step 4 — cross back; only safe fields leave the enclave
	const donRuntime = runtime.usingTheDons()
	const encodedPayload = encodeAbiParameters(
		parseAbiParameters('string verdict, uint256 verdictCode, uint256 riskMask'),
		[result.verdict, BigInt(verdictToCode(result.verdict)), BigInt(result.riskMask)],
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
