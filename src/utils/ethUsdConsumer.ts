/**
 * Read / settle Chainlink ETH/USD via EthUsdConsumer (or feed proxy) on Sepolia.
 */
import { BrowserProvider, Contract, JsonRpcProvider, formatUnits, type Signer } from 'ethers';
import {
  AGGREGATOR_V3_ABI,
  ETH_USD_CONSUMER_ABI,
  SEPOLIA_CHAIN_ID,
  SEPOLIA_ETH_USD_FEED,
  SEPOLIA_RPC_URLS,
  getEthUsdConsumerAddress,
} from './ethUsdConstants';

export type EthUsdRead = {
  usd: number;
  roundId: bigint;
  updatedAt: number;
  decimals: number;
  source: 'consumer-live' | 'consumer-settled' | 'feed';
};

function answerToUsd(answer: bigint, decimals: number): number {
  if (answer <= 0n) throw new Error('Invalid Chainlink answer');
  return Number(formatUnits(answer, decimals));
}

async function withSepoliaProvider<T>(
  fn: (provider: JsonRpcProvider | BrowserProvider) => Promise<T>
): Promise<T> {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const browser = new BrowserProvider(window.ethereum);
      const net = await browser.getNetwork();
      if (Number(net.chainId) === 11155111) {
        return await fn(browser);
      }
    } catch {
      /* fall through to public RPC */
    }
  }

  let lastErr: unknown;
  for (const url of SEPOLIA_RPC_URLS) {
    try {
      const provider = new JsonRpcProvider(url, 11155111);
      return await fn(provider);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Sepolia RPC unavailable for Chainlink read');
}

/** Live ETH/USD from consumer.getLivePrice or the Sepolia feed proxy. */
export async function readLiveEthUsd(): Promise<EthUsdRead> {
  return withSepoliaProvider(async (provider) => {
    const consumerAddr = getEthUsdConsumerAddress();
    if (consumerAddr) {
      const consumer = new Contract(consumerAddr, ETH_USD_CONSUMER_ABI, provider);
      const decimals: number = Number(await consumer.decimals());
      const [roundId, answer, updatedAt] = await consumer.getLivePrice();
      return {
        usd: answerToUsd(BigInt(answer), decimals),
        roundId: BigInt(roundId),
        updatedAt: Number(updatedAt),
        decimals,
        source: 'consumer-live',
      };
    }

    const feed = new Contract(SEPOLIA_ETH_USD_FEED, AGGREGATOR_V3_ABI, provider);
    const decimals: number = Number(await feed.decimals());
    const [roundId, answer, , updatedAt] = await feed.latestRoundData();
    return {
      usd: answerToUsd(BigInt(answer), decimals),
      roundId: BigInt(roundId),
      updatedAt: Number(updatedAt),
      decimals,
      source: 'feed',
    };
  });
}

/** Last settled snapshot from EthUsdConsumer storage (null if never settled). */
export async function readSettledEthUsd(): Promise<EthUsdRead | null> {
  const consumerAddr = getEthUsdConsumerAddress();
  if (!consumerAddr) return null;

  return withSepoliaProvider(async (provider) => {
    const consumer = new Contract(consumerAddr, ETH_USD_CONSUMER_ABI, provider);
    const decimals: number = Number(await consumer.decimals());
    const [roundId, answer, updatedAt] = await consumer.latestSettled();
    if (BigInt(answer) <= 0n) return null;
    return {
      usd: answerToUsd(BigInt(answer), decimals),
      roundId: BigInt(roundId),
      updatedAt: Number(updatedAt),
      decimals,
      source: 'consumer-settled',
    };
  });
}

export async function settleEthUsdOnchain(opts: {
  signer: Signer;
  consumerAddress?: string;
}): Promise<{ txHash: string; roundId: bigint; answer: bigint; updatedAt: number }> {
  const address = (opts.consumerAddress || getEthUsdConsumerAddress()).trim();
  if (!address) throw new Error('VITE_ETH_USD_CONSUMER_ADDRESS is not set');

  const network = await opts.signer.provider?.getNetwork();
  if (!network || Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error(
      `settleLatestPrice requires Sepolia (${SEPOLIA_CHAIN_ID}); wallet is on ${
        network ? Number(network.chainId) : 'unknown'
      }`
    );
  }

  const consumer = new Contract(address, ETH_USD_CONSUMER_ABI, opts.signer);
  const tx = await consumer.settleLatestPrice();
  const receipt = await tx.wait();
  const [roundId, answer, updatedAt] = await consumer.latestSettled();
  return {
    txHash: receipt?.hash || tx.hash,
    roundId: BigInt(roundId),
    answer: BigInt(answer),
    updatedAt: Number(updatedAt),
  };
}
