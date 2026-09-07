import { readLiveEthUsd } from './ethUsdConsumer';

export type PriceSource = 'chainlink' | 'coingecko' | 'failsafe';

export interface PriceData {
  eth_usd: number;
  gas_price_gwei: number;
  lastUpdate: number;
  source: PriceSource;
}

class PriceService {
  private cache: PriceData | null = null;
  private readonly CACHE_DURATION = 1 * 60 * 1000; // 1 minute
  private isFetching = false;

  private readonly FAILSAFE_ETH_PRICE = 3000;
  private readonly FAILSAFE_GAS_PRICE = 25;

  async getLatestData(): Promise<PriceData> {
    const now = Date.now();

    if (this.cache && now - this.cache.lastUpdate < this.CACHE_DURATION) {
      return this.cache;
    }

    if (this.isFetching && this.cache) return this.cache;
    this.isFetching = true;

    let eth_usd = this.cache?.eth_usd || this.FAILSAFE_ETH_PRICE;
    let gas_price_gwei = this.cache?.gas_price_gwei || this.FAILSAFE_GAS_PRICE;
    let source: PriceSource = this.cache?.source || 'failsafe';

    try {
      // 1. Prefer Chainlink ETH/USD on Sepolia (consumer live or feed proxy)
      try {
        const cl = await readLiveEthUsd();
        if (cl.usd > 0 && Number.isFinite(cl.usd)) {
          eth_usd = cl.usd;
          source = 'chainlink';
        }
      } catch (err) {
        console.warn('[PriceService] Chainlink ETH/USD read failed, trying CoinGecko:', err);
        const pRes = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
        );
        if (pRes.ok) {
          const pData = await pRes.json();
          if (pData.ethereum?.usd) {
            eth_usd = pData.ethereum.usd;
            source = 'coingecko';
          }
        }
      }

      // 2. Gas price via public mainnet RPCs
      const rpcUrls = [
        'https://cloudflare-eth.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
      ];

      for (const url of rpcUrls) {
        try {
          const rpcRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_gasPrice',
              params: [],
              id: 1,
            }),
            signal: AbortSignal.timeout(3000),
          });

          if (rpcRes.ok) {
            const rpcData = await rpcRes.json();
            if (rpcData.result) {
              const wei = BigInt(rpcData.result);
              const gwei = Number(wei / 1000000000n);
              // RPC 0x0 is missing/invalid — keep last good or failsafe, never cache 0.
              if (Number.isFinite(gwei) && gwei > 0) {
                gas_price_gwei = gwei;
                break;
              }
            }
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.warn('[PriceService] Network error during update, using fallback/cache:', error);
      if (!this.cache) source = 'failsafe';
    } finally {
      this.isFetching = false;
    }

    this.cache = { eth_usd, gas_price_gwei, lastUpdate: now, source };
    return this.cache;
  }

  /** Force refresh bypassing cache (e.g. after onchain settle). */
  invalidateCache(): void {
    this.cache = null;
  }

  async getEthPrice(): Promise<number> {
    const data = await this.getLatestData();
    return data.eth_usd;
  }

  async getGasPrice(): Promise<number> {
    const data = await this.getLatestData();
    return data.gas_price_gwei;
  }

  calculateUSD(ethAmount: number, ethPrice: number): number {
    return ethAmount * ethPrice;
  }

  getL2GasPrice(mainnetGwei: number, network: 'base' | 'optimism' | 'arbitrum'): number {
    const multipliers = {
      base: 0.015,
      optimism: 0.012,
      arbitrum: 0.010,
    };
    return Math.max(0.001, mainnetGwei * multipliers[network]);
  }
}

export const priceService = new PriceService();
