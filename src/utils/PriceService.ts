interface PriceData {
  eth_usd: number;
  lastUpdate: number;
}

class PriceService {
  private cache: PriceData | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getEthPrice(): Promise<number> {
    const now = Date.now();
    
    if (this.cache && (now - this.cache.lastUpdate < this.CACHE_DURATION)) {
      return this.cache.eth_usd;
    }

    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      if (data.ethereum && data.ethereum.usd) {
        this.cache = {
          eth_usd: data.ethereum.usd,
          lastUpdate: now
        };
        return data.ethereum.usd;
      }
      throw new Error('Invalid price data format');
    } catch (error) {
      console.warn('Failed to fetch ETH price, using fallback:', error);
      return this.cache?.eth_usd || 2500; // Return last known or conservative fallback
    }
  }

  calculateUSD(ethAmount: number, ethPrice: number): number {
    return ethAmount * ethPrice;
  }

  // Common L2 gas multipliers vs Mainnet
  getL2GasPrice(mainnetGwei: number, network: 'base' | 'optimism' | 'arbitrum'): number {
    const multipliers = {
      base: 0.05,
      optimism: 0.04,
      arbitrum: 0.03
    };
    return mainnetGwei * multipliers[network];
  }
}

export const priceService = new PriceService();
