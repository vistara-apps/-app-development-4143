// Data Models for LiquidityFlow AI
// Based on PRD specifications

export class Exchange {
  constructor(data = {}) {
    this.exchangeId = data.exchangeId || '';
    this.name = data.name || '';
    this.apiKey = data.apiKey || '';
    this.apiSecret = data.apiSecret || '';
    this.isActive = data.isActive || false;
    this.status = data.status || 'disconnected'; // connected, disconnected, error
    this.lastUpdate = data.lastUpdate || null;
  }

  static fromJSON(json) {
    return new Exchange(json);
  }

  toJSON() {
    return {
      exchangeId: this.exchangeId,
      name: this.name,
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
      isActive: this.isActive,
      status: this.status,
      lastUpdate: this.lastUpdate
    };
  }
}

export class MarketData {
  constructor(data = {}) {
    this.symbol = data.symbol || '';
    this.exchangeId = data.exchangeId || '';
    this.timestamp = data.timestamp || Date.now();
    this.bidPrice = data.bidPrice || 0;
    this.askPrice = data.askPrice || 0;
    this.bidVolume = data.bidVolume || 0;
    this.askVolume = data.askVolume || 0;
    this.lastPrice = data.lastPrice || 0;
    this.volume24h = data.volume24h || 0;
    this.change24h = data.change24h || 0;
    this.changePercent24h = data.changePercent24h || 0;
  }

  static fromJSON(json) {
    return new MarketData(json);
  }

  get spread() {
    return this.askPrice - this.bidPrice;
  }

  get spreadPercent() {
    return this.lastPrice > 0 ? (this.spread / this.lastPrice) * 100 : 0;
  }

  toJSON() {
    return {
      symbol: this.symbol,
      exchangeId: this.exchangeId,
      timestamp: this.timestamp,
      bidPrice: this.bidPrice,
      askPrice: this.askPrice,
      bidVolume: this.bidVolume,
      askVolume: this.askVolume,
      lastPrice: this.lastPrice,
      volume24h: this.volume24h,
      change24h: this.change24h,
      changePercent24h: this.changePercent24h
    };
  }
}

export class Trade {
  constructor(data = {}) {
    this.tradeId = data.tradeId || '';
    this.userId = data.userId || '';
    this.symbol = data.symbol || '';
    this.side = data.side || 'buy'; // buy, sell
    this.orderSize = data.orderSize || 0;
    this.entryPrice = data.entryPrice || 0;
    this.exitPrice = data.exitPrice || 0;
    this.executionTime = data.executionTime || null;
    this.exchangeUsed = data.exchangeUsed || '';
    this.slippage = data.slippage || 0;
    this.status = data.status || 'pending'; // pending, executed, failed, cancelled
    this.slippageMinimized = data.slippageMinimized || 0;
    this.predictedSlippage = data.predictedSlippage || 0;
    this.actualSlippage = data.actualSlippage || 0;
    this.fees = data.fees || 0;
    this.createdAt = data.createdAt || Date.now();
    this.updatedAt = data.updatedAt || Date.now();
  }

  static fromJSON(json) {
    return new Trade(json);
  }

  get totalCost() {
    return this.orderSize + this.fees;
  }

  get slippageSaved() {
    return Math.max(0, this.predictedSlippage - this.actualSlippage);
  }

  get profitLoss() {
    if (this.status !== 'executed' || !this.exitPrice) return 0;
    const multiplier = this.side === 'buy' ? 1 : -1;
    return (this.exitPrice - this.entryPrice) * multiplier * (this.orderSize / this.entryPrice);
  }

  toJSON() {
    return {
      tradeId: this.tradeId,
      userId: this.userId,
      symbol: this.symbol,
      side: this.side,
      orderSize: this.orderSize,
      entryPrice: this.entryPrice,
      exitPrice: this.exitPrice,
      executionTime: this.executionTime,
      exchangeUsed: this.exchangeUsed,
      slippage: this.slippage,
      status: this.status,
      slippageMinimized: this.slippageMinimized,
      predictedSlippage: this.predictedSlippage,
      actualSlippage: this.actualSlippage,
      fees: this.fees,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

export class User {
  constructor(data = {}) {
    this.userId = data.userId || '';
    this.username = data.username || '';
    this.email = data.email || '';
    this.subscriptionTier = data.subscriptionTier || 'basic'; // basic, pro, premium
    this.tradingVolumeLimit = data.tradingVolumeLimit || 100000; // in USD
    this.currentMonthVolume = data.currentMonthVolume || 0;
    this.totalTrades = data.totalTrades || 0;
    this.totalVolume = data.totalVolume || 0;
    this.totalSlippageSaved = data.totalSlippageSaved || 0;
    this.connectedExchanges = data.connectedExchanges || [];
    this.preferences = data.preferences || {};
    this.createdAt = data.createdAt || Date.now();
    this.lastLoginAt = data.lastLoginAt || null;
  }

  static fromJSON(json) {
    return new User(json);
  }

  get remainingVolumeLimit() {
    return Math.max(0, this.tradingVolumeLimit - this.currentMonthVolume);
  }

  get subscriptionLimits() {
    const limits = {
      basic: { trades: 100, volume: 100000, exchanges: 3 },
      pro: { trades: 1000, volume: 1000000, exchanges: 8 },
      premium: { trades: Infinity, volume: Infinity, exchanges: Infinity }
    };
    return limits[this.subscriptionTier] || limits.basic;
  }

  canTrade(amount) {
    const limits = this.subscriptionLimits;
    return this.currentMonthVolume + amount <= limits.volume;
  }

  toJSON() {
    return {
      userId: this.userId,
      username: this.username,
      email: this.email,
      subscriptionTier: this.subscriptionTier,
      tradingVolumeLimit: this.tradingVolumeLimit,
      currentMonthVolume: this.currentMonthVolume,
      totalTrades: this.totalTrades,
      totalVolume: this.totalVolume,
      totalSlippageSaved: this.totalSlippageSaved,
      connectedExchanges: this.connectedExchanges,
      preferences: this.preferences,
      createdAt: this.createdAt,
      lastLoginAt: this.lastLoginAt
    };
  }
}

// AI Prediction Model
export class AIPrediction {
  constructor(data = {}) {
    this.symbol = data.symbol || '';
    this.orderSize = data.orderSize || 0;
    this.side = data.side || 'buy';
    this.predictedSlippage = data.predictedSlippage || 0;
    this.optimalSize = data.optimalSize || 0;
    this.bestExchange = data.bestExchange || '';
    this.confidence = data.confidence || 0;
    this.timestamp = data.timestamp || Date.now();
    this.factors = data.factors || {};
    this.alternativeRoutes = data.alternativeRoutes || [];
  }

  static fromJSON(json) {
    return new AIPrediction(json);
  }

  toJSON() {
    return {
      symbol: this.symbol,
      orderSize: this.orderSize,
      side: this.side,
      predictedSlippage: this.predictedSlippage,
      optimalSize: this.optimalSize,
      bestExchange: this.bestExchange,
      confidence: this.confidence,
      timestamp: this.timestamp,
      factors: this.factors,
      alternativeRoutes: this.alternativeRoutes
    };
  }
}
