// Trade Service
// Handles trade execution, routing, and management

import { Trade, AIPrediction } from '../models';
import { TRADE_STATUS, ORDER_TYPES, ERROR_MESSAGES, SUCCESS_MESSAGES } from '../constants';
import { aiPredictionService } from './aiPredictionService';
import { coinGeckoService } from './coinGeckoService';

class TradeService {
  constructor() {
    this.activeTrades = new Map();
    this.tradeHistory = [];
    this.executionQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Execute a trade with AI optimization
   */
  async executeTrade(tradeParams) {
    const {
      symbol,
      side,
      orderSize,
      orderType = ORDER_TYPES.MARKET,
      userId,
      subscriptionTier = 'basic'
    } = tradeParams;

    try {
      // Validate trade parameters
      const validation = this.validateTradeParams(tradeParams);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Create trade record
      const trade = new Trade({
        tradeId: this.generateTradeId(),
        userId,
        symbol,
        side,
        orderSize,
        status: TRADE_STATUS.PENDING,
        createdAt: Date.now()
      });

      this.activeTrades.set(trade.tradeId, trade);

      // Update trade status
      await this.updateTradeStatus(trade.tradeId, TRADE_STATUS.ANALYZING);

      // Get AI analysis if subscription allows
      let aiAnalysis = null;
      if (this.hasAIAccess(subscriptionTier)) {
        try {
          const marketData = await coinGeckoService.getAggregatedMarketData([symbol]);
          aiAnalysis = await aiPredictionService.getTradeAnalysis(
            symbol,
            orderSize,
            side,
            marketData
          );
          
          // Update trade with AI predictions
          trade.predictedSlippage = aiAnalysis.predictedSlippage;
          trade.exchangeUsed = aiAnalysis.bestExchange;
        } catch (error) {
          console.warn('AI analysis failed, proceeding with fallback:', error);
        }
      }

      // Update trade status
      await this.updateTradeStatus(trade.tradeId, TRADE_STATUS.ROUTING);

      // Find optimal execution route
      const executionPlan = await this.planExecution(trade, aiAnalysis);
      
      // Update trade status
      await this.updateTradeStatus(trade.tradeId, TRADE_STATUS.EXECUTING);

      // Execute the trade
      const executionResult = await this.executeTradeOrder(trade, executionPlan);

      // Update trade with execution results
      trade.status = executionResult.success ? TRADE_STATUS.EXECUTED : TRADE_STATUS.FAILED;
      trade.executionTime = Date.now();
      trade.entryPrice = executionResult.executedPrice;
      trade.actualSlippage = executionResult.actualSlippage;
      trade.fees = executionResult.fees;
      trade.slippageMinimized = Math.max(0, (trade.predictedSlippage || 0.2) - trade.actualSlippage);

      // Move to history
      this.tradeHistory.push(trade.toJSON());
      this.activeTrades.delete(trade.tradeId);

      return {
        success: executionResult.success,
        trade: trade.toJSON(),
        message: executionResult.success ? SUCCESS_MESSAGES.TRADE_EXECUTED : executionResult.error
      };

    } catch (error) {
      console.error('Trade execution failed:', error);
      return {
        success: false,
        error: error.message,
        trade: null
      };
    }
  }

  /**
   * Validate trade parameters
   */
  validateTradeParams(params) {
    const { symbol, side, orderSize, userId } = params;

    if (!symbol || !side || !orderSize || !userId) {
      return {
        isValid: false,
        error: 'Missing required trade parameters'
      };
    }

    if (!['buy', 'sell'].includes(side)) {
      return {
        isValid: false,
        error: 'Invalid trade side. Must be "buy" or "sell"'
      };
    }

    if (orderSize <= 0) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.ORDER_SIZE_TOO_SMALL
      };
    }

    if (orderSize > 1000000) {
      return {
        isValid: false,
        error: ERROR_MESSAGES.ORDER_SIZE_TOO_LARGE
      };
    }

    return { isValid: true };
  }

  /**
   * Plan trade execution based on AI analysis and market conditions
   */
  async planExecution(trade, aiAnalysis) {
    const plan = {
      exchange: 'Binance', // Default exchange
      orderType: ORDER_TYPES.MARKET,
      expectedSlippage: 0.15,
      estimatedFees: 0.001,
      confidence: 0.7
    };

    if (aiAnalysis) {
      plan.exchange = aiAnalysis.bestExchange;
      plan.expectedSlippage = aiAnalysis.predictedSlippage;
      plan.confidence = aiAnalysis.confidence;
      
      // Adjust order type based on market conditions
      if (aiAnalysis.factors.marketVolatility > 0.7) {
        plan.orderType = ORDER_TYPES.LIMIT;
      }
    }

    // Calculate estimated fees based on exchange
    plan.estimatedFees = this.calculateFees(trade.orderSize, plan.exchange);

    return plan;
  }

  /**
   * Execute the actual trade order
   */
  async executeTradeOrder(trade, executionPlan) {
    try {
      // Simulate trade execution
      // In production, this would integrate with actual exchange APIs
      const executionResult = await this.simulateTradeExecution(trade, executionPlan);
      
      return executionResult;
    } catch (error) {
      console.error('Trade order execution failed:', error);
      return {
        success: false,
        error: error.message,
        executedPrice: 0,
        actualSlippage: 0,
        fees: 0
      };
    }
  }

  /**
   * Simulate trade execution (replace with real exchange integration)
   */
  async simulateTradeExecution(trade, executionPlan) {
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simulate market price
    const basePrice = this.getSimulatedMarketPrice(trade.symbol);
    
    // Simulate slippage
    const actualSlippage = executionPlan.expectedSlippage * (0.8 + Math.random() * 0.4);
    const slippageAmount = basePrice * (actualSlippage / 100);
    
    // Calculate executed price
    const executedPrice = trade.side === 'buy' 
      ? basePrice + slippageAmount 
      : basePrice - slippageAmount;

    // Calculate fees
    const fees = trade.orderSize * executionPlan.estimatedFees;

    // Simulate success/failure (95% success rate)
    const success = Math.random() > 0.05;

    return {
      success,
      executedPrice: success ? executedPrice : 0,
      actualSlippage: success ? actualSlippage : 0,
      fees: success ? fees : 0,
      error: success ? null : 'Execution failed due to market conditions'
    };
  }

  /**
   * Get simulated market price for a symbol
   */
  getSimulatedMarketPrice(symbol) {
    const basePrices = {
      'BTC/USDT': 45000,
      'ETH/USDT': 3000,
      'BNB/USDT': 300,
      'ADA/USDT': 0.5,
      'SOL/USDT': 100
    };

    const basePrice = basePrices[symbol] || 100;
    // Add some random variation
    return basePrice * (0.98 + Math.random() * 0.04);
  }

  /**
   * Calculate trading fees based on exchange
   */
  calculateFees(orderSize, exchange) {
    const feeRates = {
      'Binance': 0.001,
      'Coinbase': 0.005,
      'Kraken': 0.0016,
      'Bitfinex': 0.002,
      'KuCoin': 0.001
    };

    const rate = feeRates[exchange] || 0.002;
    return orderSize * rate;
  }

  /**
   * Update trade status
   */
  async updateTradeStatus(tradeId, status) {
    const trade = this.activeTrades.get(tradeId);
    if (trade) {
      trade.status = status;
      trade.updatedAt = Date.now();
      
      // Emit status update event (could be enhanced with event emitter)
      console.log(`Trade ${tradeId} status updated to: ${status}`);
    }
  }

  /**
   * Check if user has AI access based on subscription
   */
  hasAIAccess(subscriptionTier) {
    return ['pro', 'premium'].includes(subscriptionTier);
  }

  /**
   * Generate unique trade ID
   */
  generateTradeId() {
    return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active trades for a user
   */
  getActiveTrades(userId) {
    return Array.from(this.activeTrades.values())
      .filter(trade => trade.userId === userId)
      .map(trade => trade.toJSON());
  }

  /**
   * Get trade history for a user
   */
  getTradeHistory(userId, limit = 50) {
    return this.tradeHistory
      .filter(trade => trade.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  /**
   * Get trade by ID
   */
  getTrade(tradeId) {
    const activeTrade = this.activeTrades.get(tradeId);
    if (activeTrade) {
      return activeTrade.toJSON();
    }

    return this.tradeHistory.find(trade => trade.tradeId === tradeId);
  }

  /**
   * Cancel an active trade
   */
  async cancelTrade(tradeId, userId) {
    const trade = this.activeTrades.get(tradeId);
    
    if (!trade) {
      throw new Error('Trade not found or already completed');
    }

    if (trade.userId !== userId) {
      throw new Error('Unauthorized to cancel this trade');
    }

    if (trade.status === TRADE_STATUS.EXECUTING) {
      throw new Error('Cannot cancel trade that is currently executing');
    }

    trade.status = TRADE_STATUS.CANCELLED;
    trade.updatedAt = Date.now();

    // Move to history
    this.tradeHistory.push(trade.toJSON());
    this.activeTrades.delete(tradeId);

    return {
      success: true,
      message: 'Trade cancelled successfully',
      trade: trade.toJSON()
    };
  }

  /**
   * Get trading statistics for a user
   */
  getTradingStats(userId, period = '30d') {
    const now = Date.now();
    const periodMs = this.getPeriodInMs(period);
    const startTime = now - periodMs;

    const trades = this.tradeHistory.filter(trade => 
      trade.userId === userId && 
      trade.createdAt >= startTime &&
      trade.status === TRADE_STATUS.EXECUTED
    );

    const totalVolume = trades.reduce((sum, trade) => sum + trade.orderSize, 0);
    const totalFees = trades.reduce((sum, trade) => sum + (trade.fees || 0), 0);
    const totalSlippageSaved = trades.reduce((sum, trade) => sum + (trade.slippageMinimized || 0), 0);
    const avgSlippage = trades.length > 0 
      ? trades.reduce((sum, trade) => sum + (trade.actualSlippage || 0), 0) / trades.length 
      : 0;

    return {
      period,
      totalTrades: trades.length,
      totalVolume,
      totalFees,
      totalSlippageSaved,
      avgSlippage,
      successRate: trades.length > 0 ? (trades.length / (trades.length + this.getFailedTrades(userId, startTime))) * 100 : 0
    };
  }

  /**
   * Get failed trades count for success rate calculation
   */
  getFailedTrades(userId, startTime) {
    return this.tradeHistory.filter(trade => 
      trade.userId === userId && 
      trade.createdAt >= startTime &&
      trade.status === TRADE_STATUS.FAILED
    ).length;
  }

  /**
   * Convert period string to milliseconds
   */
  getPeriodInMs(period) {
    const periods = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000
    };
    return periods[period] || periods['30d'];
  }

  /**
   * Get market analysis for a symbol
   */
  async getMarketAnalysis(symbol) {
    try {
      const [marketData, aiAnalysis] = await Promise.all([
        coinGeckoService.getAggregatedMarketData([symbol]),
        aiPredictionService.getTradeAnalysis(symbol, 10000, 'buy')
      ]);

      return {
        symbol,
        marketData: marketData[0] || null,
        aiAnalysis,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Market analysis failed:', error);
      return {
        symbol,
        marketData: null,
        aiAnalysis: null,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Clear trade history (for testing/admin purposes)
   */
  clearHistory() {
    this.tradeHistory = [];
    this.activeTrades.clear();
  }
}

// Export singleton instance
export const tradeService = new TradeService();
export default tradeService;
