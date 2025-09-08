import React, { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, Zap, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { PriceChart } from './PriceChart'
import { MarketDataTable } from './MarketDataTable'
import { useMarketData } from '../hooks/useMarketData'
import { tradeService } from '../services/tradeService'
import { aiPredictionService } from '../services/aiPredictionService'

export function Dashboard({ subscriptionTier, userId = 'demo-user' }) {
  const [tradingStats, setTradingStats] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const { 
    marketSummary, 
    loading: marketLoading, 
    error: marketError,
    connectedExchanges,
    isRealTime,
    refresh: refreshMarketData,
    lastUpdate
  } = useMarketData(['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT']);

  // Fetch trading statistics
  useEffect(() => {
    const fetchTradingStats = async () => {
      try {
        const stats = tradeService.getTradingStats(userId, '30d');
        setTradingStats(stats);
      } catch (error) {
        console.error('Failed to fetch trading stats:', error);
      }
    };

    fetchTradingStats();
    const interval = setInterval(fetchTradingStats, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [userId]);

  // Fetch AI analysis for BTC/USDT
  useEffect(() => {
    const fetchAiAnalysis = async () => {
      if (subscriptionTier === 'basic') return;
      
      try {
        const analysis = await aiPredictionService.getTradeAnalysis('BTC/USDT', 10000, 'buy');
        setAiAnalysis(analysis);
      } catch (error) {
        console.error('Failed to fetch AI analysis:', error);
      }
    };

    fetchAiAnalysis();
    const interval = setInterval(fetchAiAnalysis, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [subscriptionTier]);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMarketData();
      if (tradingStats) {
        const stats = tradeService.getTradingStats(userId, '30d');
        setTradingStats(stats);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate dynamic stats
  const stats = [
    { 
      label: 'Total Volume', 
      value: tradingStats ? `$${(tradingStats.totalVolume / 1000).toFixed(1)}K` : '$0', 
      change: tradingStats ? `+${((tradingStats.totalVolume / 100000) * 100).toFixed(1)}%` : '+0%', 
      trend: 'up',
      icon: DollarSign,
      loading: !tradingStats
    },
    { 
      label: 'Slippage Saved', 
      value: tradingStats ? `${tradingStats.totalSlippageSaved.toFixed(2)}%` : '0%', 
      change: tradingStats ? `+${(tradingStats.totalSlippageSaved * 0.3).toFixed(2)}%` : '+0%', 
      trend: 'up',
      icon: Zap,
      loading: !tradingStats
    },
    { 
      label: 'Active Exchanges', 
      value: connectedExchanges.toString(), 
      change: connectedExchanges > 3 ? '+2' : '0', 
      trend: connectedExchanges > 3 ? 'up' : 'neutral',
      icon: TrendingUp,
      loading: false
    },
    { 
      label: 'Success Rate', 
      value: tradingStats ? `${tradingStats.successRate.toFixed(1)}%` : '0%', 
      change: tradingStats ? `+${(tradingStats.successRate * 0.1).toFixed(1)}%` : '+0%', 
      trend: tradingStats && tradingStats.successRate > 90 ? 'up' : 'neutral',
      icon: Zap,
      loading: !tradingStats
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header with Status and Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <div className="flex items-center space-x-2">
            {isRealTime ? (
              <div className="flex items-center text-green-600">
                <Wifi className="w-4 h-4 mr-1" />
                <span className="text-sm">Live</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-500">
                <WifiOff className="w-4 h-4 mr-1" />
                <span className="text-sm">Offline</span>
              </div>
            )}
            {lastUpdate && (
              <span className="text-xs text-gray-500">
                Updated {new Date(lastUpdate).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Alert */}
      {marketError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            Market data error: {marketError}
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div key={index} className="card p-4 lg:p-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  {stat.loading ? (
                    <div className="w-16 h-6 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    <p className="text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                  )}
                  <div className="flex items-center mt-2">
                    {stat.trend === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                    ) : stat.trend === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
                    ) : (
                      <div className="w-4 h-4 mr-1" />
                    )}
                    <span className={`text-sm font-medium ${
                      stat.trend === 'up' ? 'text-green-600' : 
                      stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
                    }`}>
                      {stat.change}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gradient-accent rounded-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <div className="card p-4 lg:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Trends</h3>
          <PriceChart />
        </div>
        
        <div className="card p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">AI Analysis</h3>
            {subscriptionTier === 'basic' && (
              <span className="px-2 py-1 text-xs font-medium text-orange-600 bg-orange-100 rounded">
                Pro Feature
              </span>
            )}
          </div>
          
          {subscriptionTier === 'basic' ? (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">AI-powered analysis available in Pro and Premium plans</p>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                Upgrade to Pro
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Best Exchange</span>
                {aiAnalysis ? (
                  <span className="text-sm text-gray-600">{aiAnalysis.bestExchange}</span>
                ) : (
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Predicted Slippage</span>
                {aiAnalysis ? (
                  <span className="text-sm text-green-600">{(aiAnalysis.predictedSlippage * 100).toFixed(2)}%</span>
                ) : (
                  <div className="w-12 h-4 bg-gray-200 rounded animate-pulse"></div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Optimal Size</span>
                {aiAnalysis ? (
                  <span className="text-sm text-gray-600">${(aiAnalysis.optimalSize / 1000).toFixed(1)}K</span>
                ) : (
                  <div className="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium">Confidence</span>
                {aiAnalysis ? (
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${aiAnalysis.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600">{(aiAnalysis.confidence * 100).toFixed(0)}%</span>
                  </div>
                ) : (
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse"></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Market Data Table */}
      <div className="card p-4 lg:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Market Data</h3>
        <MarketDataTable subscriptionTier={subscriptionTier} />
      </div>
    </div>
  )
}
