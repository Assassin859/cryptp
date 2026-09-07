/**
 * Chainlink ETH/USD Price Feeds (Continuity A) — Sepolia constants + ABI.
 */

/** Official Chainlink ETH/USD aggregator proxy on Ethereum Sepolia */
export const SEPOLIA_ETH_USD_FEED =
  '0x694AA1769357215DE4FAC081bf1f309aDC325306' as const;

export const SEPOLIA_CHAIN_ID = 11155111;

export const ETH_USD_CONSUMER_ABI = [
  'function feed() view returns (address)',
  'function decimals() view returns (uint8)',
  'function getLivePrice() view returns (uint80 roundId, int256 answer, uint256 updatedAt)',
  'function latestSettled() view returns (uint80 roundId, int256 answer, uint256 updatedAt, uint256 settledTimestamp, address settler)',
  'function settleLatestPrice() returns (uint80 roundId, int256 answer, uint256 updatedAt)',
  'event PriceSettled(uint80 indexed roundId, int256 answer, uint256 updatedAt, address indexed settler)',
] as const;

export const AGGREGATOR_V3_ABI = [
  'function decimals() view returns (uint8)',
  'function latestRoundData() view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)',
] as const;

export function getEthUsdConsumerAddress(): string {
  return (import.meta.env.VITE_ETH_USD_CONSUMER_ADDRESS as string | undefined)?.trim() || '';
}

/** Public Sepolia RPCs for eth_call when wallet is not on Sepolia */
export const SEPOLIA_RPC_URLS = [
  'https://ethereum-sepolia-rpc.publicnode.com',
  'https://rpc.sepolia.org',
  'https://1rpc.io/sepolia',
] as const;
