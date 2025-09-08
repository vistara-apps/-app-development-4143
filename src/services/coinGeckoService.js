// CoinGecko API Service
// Handles market data aggregation from CoinGecko API

import { API_ENDPOINTS } from '../constants';
import { MarketData } from '../models';

class CoinGeckoService {
  constructor() {
    this.baseURL = API_ENDPOINTS.COINGECKO.BASE_URL;
    this.cache = new Map();
    this.cacheTimeout = 30000; // 30 seconds
  }

  /**
   * Generic API request handler with error handling and caching
   */
  async makeRequest(endpoint, params = {}) {
    const cacheKey = `${endpoint}_${JSON.stringify(params)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    try {
      const url = new URL(`${this.baseURL}${endpoint}`);
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          url.searchParams.append(key, params[key]);
        }
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error('CoinGecko API request failed:', error);
      throw error;
    }
  }

  /**
   * Get list of supported exchanges
   */
  async getExchanges() {
    try {
      const data = await this.makeRequest(API_ENDPOINTS.COINGECKO.EXCHANGES, {
        per_page: 100,
        page: 1
      });

      return data.map(exchange => ({
        id: exchange.id,
        name: exchange.name,
        volume24h: exchange.trade_volume_24h_btc,
        trustScore: exchange.trust_score,
        country: exchange.country,
        url: exchange.url,
        status: 'active'
      }));
    } catch (error) {
      console.error('Failed to fetch exchanges:', error);
      return [];
    }
  }

  /**
   * Get market data for specific coins
   */
  async getMarketData(coins = ['bitcoin', 'ethereum', 'binancecoin', 'cardano', 'solana']) {
    try {
      const data = await this.makeRequest(API_ENDPOINTS.COINGECKO.COINS, {
        vs_currency: 'usd',
        ids: coins.join(','),
        order: 'market_cap_desc',
        per_page: coins.length,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h'
      });

      return data.map(coin => new MarketData({
        symbol: this.mapCoinToSymbol(coin.id),
        exchangeId: 'coingecko',
        timestamp: Date.now(),
        lastPrice: coin.current_price,
        volume24h: coin.total_volume,
        change24h: coin.price_change_24h,
        changePercent24h: coin.price_change_percentage_24h,
        marketCap: coin.market_cap,
        rank: coin.market_cap_rank
      }));
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      return [];
    }
  }

  /**
   * Get simple price data for multiple coins
   */
  async getSimplePrices(coins, vsCurrencies = ['usd']) {
    try {
      const data = await this.makeRequest(API_ENDPOINTS.COINGECKO.PRICE, {
        ids: coins.join(','),
        vs_currencies: vsCurrencies.join(','),
        include_24hr_change: true,
        include_24hr_vol: true,
        include_last_updated_at: true
      });

      return data;
    } catch (error) {
      console.error('Failed to fetch simple prices:', error);
      return {};
    }
  }

  /**
   * Get exchange tickers for a specific exchange
   */
  async getExchangeTickers(exchangeId, coinIds = []) {
    try {
      const endpoint = API_ENDPOINTS.COINGECKO.TICKERS.replace('{id}', exchangeId);
      const params = {
        page: 1,
        per_page: 100
      };

      if (coinIds.length > 0) {
        params.coin_ids = coinIds.join(',');
      }

      const data = await this.makeRequest(endpoint, params);

      return data.tickers?.map(ticker => new MarketData({
        symbol: ticker.base + '/' + ticker.target,
        exchangeId: exchangeId,
        timestamp: Date.now(),
        lastPrice: ticker.last,
        bidPrice: ticker.bid_ask_spread_percentage ? ticker.last * (1 - ticker.bid_ask_spread_percentage / 200) : ticker.last,
        askPrice: ticker.bid_ask_spread_percentage ? ticker.last * (1 + ticker.bid_ask_spread_percentage / 200) : ticker.last,
        volume24h: ticker.volume,
        trustScore: ticker.trust_score
      })) || [];
    } catch (error) {
      console.error(`Failed to fetch tickers for ${exchangeId}:`, error);
      return [];
    }
  }

  /**
   * Get aggregated market data across multiple exchanges
   */
  async getAggregatedMarketData(symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT']) {
    try {
      const exchanges = ['binance', 'coinbase-exchange', 'kraken', 'bitfinex'];
      const allData = [];

      // Fetch data from multiple exchanges in parallel
      const promises = exchanges.map(async (exchangeId) => {
        try {
          const tickers = await this.getExchangeTickers(exchangeId);
          return tickers.filter(ticker => symbols.includes(ticker.symbol));
        } catch (error) {
          console.warn(`Failed to fetch data from ${exchangeId}:`, error);
          return [];
        }
      });

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          allData.push(...result.value);
        }
      });

      // Group by symbol and calculate aggregated metrics
      const aggregated = {};
      allData.forEach(data => {
        if (!aggregated[data.symbol]) {
          aggregated[data.symbol] = {
            symbol: data.symbol,
            exchanges: [],
            avgPrice: 0,
            totalVolume: 0,
            bestBid: 0,
            bestAsk: Infinity,
            spread: 0,
            timestamp: Date.now()
          };
        }

        const agg = aggregated[data.symbol];
        agg.exchanges.push({
          exchangeId: data.exchangeId,
          price: data.lastPrice,
          volume: data.volume24h,
          bid: data.bidPrice,
          ask: data.askPrice
        });

        agg.totalVolume += data.volume24h || 0;
        agg.bestBid = Math.max(agg.bestBid, data.bidPrice || 0);
        agg.bestAsk = Math.min(agg.bestAsk, data.askPrice || Infinity);
      });

      // Calculate weighted average prices
      Object.values(aggregated).forEach(agg => {
        let totalWeightedPrice = 0;
        let totalWeight = 0;

        agg.exchanges.forEach(ex => {
          const weight = ex.volume || 1;
          totalWeightedPrice += ex.price * weight;
          totalWeight += weight;
        });

        agg.avgPrice = totalWeight > 0 ? totalWeightedPrice / totalWeight : 0;
        agg.spread = agg.bestAsk !== Infinity ? agg.bestAsk - agg.bestBid : 0;
        agg.spreadPercent = agg.avgPrice > 0 ? (agg.spread / agg.avgPrice) * 100 : 0;
      });

      return Object.values(aggregated);
    } catch (error) {
      console.error('Failed to get aggregated market data:', error);
      return [];
    }
  }

  /**
   * Map CoinGecko coin IDs to trading symbols
   */
  mapCoinToSymbol(coinId) {
    const mapping = {
      'bitcoin': 'BTC/USDT',
      'ethereum': 'ETH/USDT',
      'binancecoin': 'BNB/USDT',
      'cardano': 'ADA/USDT',
      'solana': 'SOL/USDT',
      'ripple': 'XRP/USDT',
      'litecoin': 'LTC/USDT',
      'bitcoin-cash': 'BCH/USDT'
    };
    return mapping[coinId] || coinId.toUpperCase() + '/USDT';
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      timeout: this.cacheTimeout
    };
  }
}

// Export singleton instance
export const coinGeckoService = new CoinGeckoService();
export default coinGeckoService;
