interface PriceData {
  eth_usd: number;
  gas_price_gwei: number;
  lastUpdate: number;
}

class PriceService {
  private cache: PriceData | null = null;
  private readonly CACHE_DURATION = 1 * 60 * 1000; // 1 minute
  private isFetching = false;

  // More realistic "last resort" fallbacks if network is completely down
  private readonly FAILSAFE_ETH_PRICE = 3000; 
  private readonly FAILSAFE_GAS_PRICE = 25;

  async getLatestData(): Promise<PriceData> {
    const now = Date.now();
    
    if (this.cache && (now - this.cache.lastUpdate < this.CACHE_DURATION)) {
      return this.cache;
    }

    if (this.isFetching && this.cache) return this.cache;
    this.isFetching = true;

    let eth_usd = this.cache?.eth_usd || this.FAILSAFE_ETH_PRICE;
    let gas_price_gwei = this.cache?.gas_price_gwei || this.FAILSAFE_GAS_PRICE;

    try {
      // 1. Fetch ETH Price from CoinGecko
      const pRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.ethereum?.usd) eth_usd = pData.ethereum.usd;
      }

      // 2. Fetch Gas Price (Try Public RPCs first as they're faster/free)
      const rpcUrls = [
        'https://cloudflare-eth.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth'
      ];

      for (const url of rpcUrls) {
        try {
          const rpcRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_gasPrice', params: [], id: 1 }),
            signal: AbortSignal.timeout(3000)
          });
          
          if (rpcRes.ok) {
            const rpcData = await rpcRes.json();
            if (rpcData.result) {
              const wei = BigInt(rpcData.result);
              gas_price_gwei = Number(wei / 1000000000n);
              break; // Success
            }
          }
        } catch (e) {
          continue; // Try next RPC
        }
      }
    } catch (error) {
      console.warn('[PriceService] Network error during update, using fallback/cache:', error);
    } finally {
      this.isFetching = false;
    }

    this.cache = { eth_usd, gas_price_gwei, lastUpdate: now };
    return this.cache;
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

  /**
   * Returns a dynamic multiplier for L2 networks based on current observed mainnet gas.
   * In a real system, these would be fetched from specific L2 sequencers.
   */
  getL2GasPrice(mainnetGwei: number, network: 'base' | 'optimism' | 'arbitrum'): number {
    // Current average ratios (relative to L1 gas)
    const multipliers = {
      base: 0.015,     // L2s are significantly cheaper post-Dencun/EIP-4844
      optimism: 0.012,
      arbitrum: 0.010
    };
    return Math.max(0.001, mainnetGwei * multipliers[network]);
  }
}

export const priceService = new PriceService();

