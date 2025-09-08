// React Hook for Market Data
// Provides real-time market data and aggregated information

import { useState, useEffect, useCallback, useRef } from 'react';
import { coinGeckoService } from '../services/coinGeckoService';
import { websocketService } from '../services/websocketService';

export function useMarketData(symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'], options = {}) {
  const {
    enableRealTime = true,
    refreshInterval = 30000, // 30 seconds
    exchanges = ['binance', 'coinbase', 'kraken']
  } = options;

  const [marketData, setMarketData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({});

  const unsubscribeFunctions = useRef([]);
  const refreshTimer = useRef(null);

  // Fetch initial market data
  const fetchMarketData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await coinGeckoService.getAggregatedMarketData(symbols);
      setMarketData(data);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('Failed to fetch market data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [symbols]);

  // Handle real-time market data updates
  const handleMarketDataUpdate = useCallback((newData) => {
    setMarketData(prevData => {
      const updatedData = [...prevData];
      const existingIndex = updatedData.findIndex(item => 
        item.symbol === newData.symbol && item.exchangeId === newData.exchangeId
      );

      if (existingIndex >= 0) {
        updatedData[existingIndex] = newData;
      } else {
        updatedData.push(newData);
      }

      return updatedData;
    });
    setLastUpdate(Date.now());
  }, []);

  // Subscribe to real-time updates
  const subscribeToRealTimeData = useCallback(() => {
    if (!enableRealTime) return;

    // Clear existing subscriptions
    unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
    unsubscribeFunctions.current = [];

    // Subscribe to each symbol on each exchange
    symbols.forEach(symbol => {
      exchanges.forEach(exchange => {
        const unsubscribe = websocketService.subscribe(
          exchange,
          symbol,
          handleMarketDataUpdate
        );
        unsubscribeFunctions.current.push(unsubscribe);
      });
    });

    // Monitor connection status
    const statusInterval = setInterval(() => {
      setConnectionStatus(websocketService.getConnectionStatus());
    }, 5000);

    return () => {
      clearInterval(statusInterval);
    };
  }, [symbols, exchanges, enableRealTime, handleMarketDataUpdate]);

  // Setup periodic refresh for non-real-time data
  const setupPeriodicRefresh = useCallback(() => {
    if (enableRealTime) return;

    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }

    refreshTimer.current = setInterval(fetchMarketData, refreshInterval);

    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, [fetchMarketData, refreshInterval, enableRealTime]);

  // Initialize data fetching
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Setup real-time subscriptions or periodic refresh
  useEffect(() => {
    let cleanup;

    if (enableRealTime) {
      cleanup = subscribeToRealTimeData();
    } else {
      cleanup = setupPeriodicRefresh();
    }

    return cleanup;
  }, [enableRealTime, subscribeToRealTimeData, setupPeriodicRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Unsubscribe from all real-time data
      unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
      
      // Clear refresh timer
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current);
      }
    };
  }, []);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Get data for a specific symbol
  const getSymbolData = useCallback((symbol) => {
    return marketData.filter(data => data.symbol === symbol);
  }, [marketData]);

  // Get best price across exchanges for a symbol
  const getBestPrice = useCallback((symbol, side = 'buy') => {
    const symbolData = getSymbolData(symbol);
    if (symbolData.length === 0) return null;

    if (side === 'buy') {
      // For buying, we want the lowest ask price
      return symbolData.reduce((best, current) => 
        (current.askPrice && (!best || current.askPrice < best.askPrice)) ? current : best
      );
    } else {
      // For selling, we want the highest bid price
      return symbolData.reduce((best, current) => 
        (current.bidPrice && (!best || current.bidPrice > best.bidPrice)) ? current : best
      );
    }
  }, [getSymbolData]);

  // Get aggregated data for a symbol (average across exchanges)
  const getAggregatedData = useCallback((symbol) => {
    const symbolData = getSymbolData(symbol);
    if (symbolData.length === 0) return null;

    const totalVolume = symbolData.reduce((sum, data) => sum + (data.volume24h || 0), 0);
    const avgPrice = symbolData.reduce((sum, data) => sum + (data.lastPrice || 0), 0) / symbolData.length;
    const bestBid = Math.max(...symbolData.map(data => data.bidPrice || 0));
    const bestAsk = Math.min(...symbolData.map(data => data.askPrice || Infinity).filter(price => price !== Infinity));

    return {
      symbol,
      avgPrice,
      bestBid,
      bestAsk: bestAsk === Infinity ? null : bestAsk,
      totalVolume,
      spread: bestAsk !== Infinity ? bestAsk - bestBid : null,
      spreadPercent: (bestAsk !== Infinity && avgPrice > 0) ? ((bestAsk - bestBid) / avgPrice) * 100 : null,
      exchanges: symbolData.length,
      lastUpdate: Math.max(...symbolData.map(data => data.timestamp))
    };
  }, [getSymbolData]);

  // Get market summary
  const getMarketSummary = useCallback(() => {
    const summary = symbols.map(symbol => {
      const aggregated = getAggregatedData(symbol);
      const symbolData = getSymbolData(symbol);
      
      return {
        symbol,
        ...aggregated,
        change24h: symbolData.length > 0 ? symbolData[0].change24h : 0,
        changePercent24h: symbolData.length > 0 ? symbolData[0].changePercent24h : 0
      };
    });

    return summary;
  }, [symbols, getAggregatedData, getSymbolData]);

  return {
    // Data
    marketData,
    marketSummary: getMarketSummary(),
    connectionStatus,
    
    // State
    loading,
    error,
    lastUpdate,
    
    // Actions
    refresh,
    
    // Utilities
    getSymbolData,
    getBestPrice,
    getAggregatedData,
    
    // Meta
    isRealTime: enableRealTime,
    connectedExchanges: Object.keys(connectionStatus).filter(
      exchange => connectionStatus[exchange]?.connected
    ).length
  };
}

// Hook for single symbol market data
export function useSymbolData(symbol, options = {}) {
  const { marketData, loading, error, ...rest } = useMarketData([symbol], options);
  
  const symbolData = marketData.filter(data => data.symbol === symbol);
  const aggregatedData = symbolData.length > 0 ? {
    symbol,
    lastPrice: symbolData.reduce((sum, data) => sum + (data.lastPrice || 0), 0) / symbolData.length,
    volume24h: symbolData.reduce((sum, data) => sum + (data.volume24h || 0), 0),
    change24h: symbolData[0]?.change24h || 0,
    changePercent24h: symbolData[0]?.changePercent24h || 0,
    bestBid: Math.max(...symbolData.map(data => data.bidPrice || 0)),
    bestAsk: Math.min(...symbolData.map(data => data.askPrice || Infinity).filter(price => price !== Infinity)),
    exchanges: symbolData.length
  } : null;

  return {
    data: aggregatedData,
    rawData: symbolData,
    loading,
    error,
    ...rest
  };
}

// Hook for price alerts
export function usePriceAlerts(alerts = []) {
  const [triggeredAlerts, setTriggeredAlerts] = useState([]);
  const { marketData } = useMarketData(
    alerts.map(alert => alert.symbol),
    { enableRealTime: true }
  );

  useEffect(() => {
    alerts.forEach(alert => {
      const symbolData = marketData.find(data => data.symbol === alert.symbol);
      if (!symbolData) return;

      const currentPrice = symbolData.lastPrice;
      const shouldTrigger = alert.condition === 'above' 
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;

      if (shouldTrigger && !triggeredAlerts.find(t => t.id === alert.id)) {
        setTriggeredAlerts(prev => [...prev, {
          ...alert,
          triggeredAt: Date.now(),
          triggeredPrice: currentPrice
        }]);
      }
    });
  }, [marketData, alerts, triggeredAlerts]);

  const clearAlert = useCallback((alertId) => {
    setTriggeredAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setTriggeredAlerts([]);
  }, []);

  return {
    triggeredAlerts,
    clearAlert,
    clearAllAlerts
  };
}
