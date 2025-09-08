// WebSocket Service
// Handles real-time market data connections to multiple exchanges

import { API_ENDPOINTS, WS_EVENTS } from '../constants';
import { MarketData } from '../models';

class WebSocketService {
  constructor() {
    this.connections = new Map();
    this.subscribers = new Map();
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
    this.isConnecting = new Set();
  }

  /**
   * Subscribe to market data for a specific symbol and exchange
   */
  subscribe(exchange, symbol, callback) {
    const key = `${exchange}_${symbol}`;
    
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key).add(callback);
    
    // Establish connection if not already connected
    if (!this.connections.has(exchange)) {
      this.connect(exchange);
    } else {
      // Subscribe to the symbol on existing connection
      this.subscribeToSymbol(exchange, symbol);
    }

    // Return unsubscribe function
    return () => {
      this.unsubscribe(exchange, symbol, callback);
    };
  }

  /**
   * Unsubscribe from market data
   */
  unsubscribe(exchange, symbol, callback) {
    const key = `${exchange}_${symbol}`;
    
    if (this.subscribers.has(key)) {
      this.subscribers.get(key).delete(callback);
      
      // If no more subscribers for this symbol, unsubscribe from exchange
      if (this.subscribers.get(key).size === 0) {
        this.subscribers.delete(key);
        this.unsubscribeFromSymbol(exchange, symbol);
      }
    }
  }

  /**
   * Connect to an exchange WebSocket
   */
  async connect(exchange) {
    if (this.connections.has(exchange) || this.isConnecting.has(exchange)) {
      return;
    }

    this.isConnecting.add(exchange);

    try {
      const wsUrl = this.getWebSocketUrl(exchange);
      if (!wsUrl) {
        throw new Error(`WebSocket URL not configured for ${exchange}`);
      }

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`Connected to ${exchange} WebSocket`);
        this.connections.set(exchange, ws);
        this.isConnecting.delete(exchange);
        this.reconnectAttempts.delete(exchange);
        
        // Subscribe to all symbols that have subscribers
        this.resubscribeToSymbols(exchange);
        
        this.emit(WS_EVENTS.CONNECT, { exchange });
      };

      ws.onmessage = (event) => {
        this.handleMessage(exchange, event.data);
      };

      ws.onclose = (event) => {
        console.log(`Disconnected from ${exchange} WebSocket:`, event.code, event.reason);
        this.connections.delete(exchange);
        this.isConnecting.delete(exchange);
        
        this.emit(WS_EVENTS.DISCONNECT, { exchange, code: event.code, reason: event.reason });
        
        // Attempt to reconnect if not a clean close
        if (event.code !== 1000) {
          this.scheduleReconnect(exchange);
        }
      };

      ws.onerror = (error) => {
        console.error(`WebSocket error for ${exchange}:`, error);
        this.isConnecting.delete(exchange);
        this.emit(WS_EVENTS.ERROR, { exchange, error });
      };

    } catch (error) {
      console.error(`Failed to connect to ${exchange}:`, error);
      this.isConnecting.delete(exchange);
      this.scheduleReconnect(exchange);
    }
  }

  /**
   * Disconnect from an exchange WebSocket
   */
  disconnect(exchange) {
    if (this.connections.has(exchange)) {
      const ws = this.connections.get(exchange);
      ws.close(1000, 'Client disconnect');
      this.connections.delete(exchange);
    }
    
    this.reconnectAttempts.delete(exchange);
    this.isConnecting.delete(exchange);
  }

  /**
   * Disconnect from all exchanges
   */
  disconnectAll() {
    for (const exchange of this.connections.keys()) {
      this.disconnect(exchange);
    }
    this.subscribers.clear();
  }

  /**
   * Get WebSocket URL for an exchange
   */
  getWebSocketUrl(exchange) {
    const urls = {
      binance: API_ENDPOINTS.WEBSOCKETS.BINANCE,
      coinbase: API_ENDPOINTS.WEBSOCKETS.COINBASE,
      kraken: API_ENDPOINTS.WEBSOCKETS.KRAKEN,
      bitfinex: API_ENDPOINTS.WEBSOCKETS.BITFINEX,
      kucoin: API_ENDPOINTS.WEBSOCKETS.KUCOIN
    };
    
    return urls[exchange.toLowerCase()];
  }

  /**
   * Handle incoming WebSocket messages
   */
  handleMessage(exchange, data) {
    try {
      const message = JSON.parse(data);
      const marketData = this.parseMarketData(exchange, message);
      
      if (marketData) {
        this.notifySubscribers(exchange, marketData.symbol, marketData);
      }
    } catch (error) {
      console.error(`Failed to parse message from ${exchange}:`, error);
    }
  }

  /**
   * Parse market data based on exchange format
   */
  parseMarketData(exchange, message) {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return this.parseBinanceData(message);
      case 'coinbase':
        return this.parseCoinbaseData(message);
      case 'kraken':
        return this.parseKrakenData(message);
      case 'bitfinex':
        return this.parseBitfinexData(message);
      case 'kucoin':
        return this.parseKuCoinData(message);
      default:
        return null;
    }
  }

  /**
   * Parse Binance WebSocket data
   */
  parseBinanceData(message) {
    if (message.e === '24hrTicker') {
      return new MarketData({
        symbol: message.s.replace('USDT', '/USDT'),
        exchangeId: 'binance',
        timestamp: message.E,
        lastPrice: parseFloat(message.c),
        bidPrice: parseFloat(message.b),
        askPrice: parseFloat(message.a),
        volume24h: parseFloat(message.v),
        change24h: parseFloat(message.P),
        changePercent24h: parseFloat(message.P)
      });
    }
    return null;
  }

  /**
   * Parse Coinbase WebSocket data
   */
  parseCoinbaseData(message) {
    if (message.type === 'ticker') {
      return new MarketData({
        symbol: message.product_id.replace('-', '/'),
        exchangeId: 'coinbase',
        timestamp: new Date(message.time).getTime(),
        lastPrice: parseFloat(message.price),
        bidPrice: parseFloat(message.best_bid),
        askPrice: parseFloat(message.best_ask),
        volume24h: parseFloat(message.volume_24h)
      });
    }
    return null;
  }

  /**
   * Parse Kraken WebSocket data
   */
  parseKrakenData(message) {
    // Kraken has a more complex message format
    if (Array.isArray(message) && message.length > 1) {
      const data = message[1];
      if (data && data.c) {
        return new MarketData({
          symbol: this.normalizeKrakenSymbol(message[3]),
          exchangeId: 'kraken',
          timestamp: Date.now(),
          lastPrice: parseFloat(data.c[0]),
          bidPrice: parseFloat(data.b[0]),
          askPrice: parseFloat(data.a[0]),
          volume24h: parseFloat(data.v[1])
        });
      }
    }
    return null;
  }

  /**
   * Parse Bitfinex WebSocket data
   */
  parseBitfinexData(message) {
    if (Array.isArray(message) && message.length > 10) {
      return new MarketData({
        symbol: this.normalizeBitfinexSymbol(message[0]),
        exchangeId: 'bitfinex',
        timestamp: Date.now(),
        lastPrice: message[7],
        bidPrice: message[1],
        askPrice: message[3],
        volume24h: message[8],
        change24h: message[5],
        changePercent24h: message[6] * 100
      });
    }
    return null;
  }

  /**
   * Parse KuCoin WebSocket data
   */
  parseKuCoinData(message) {
    if (message.type === 'message' && message.topic && message.data) {
      const data = message.data;
      return new MarketData({
        symbol: message.subject.replace('-', '/'),
        exchangeId: 'kucoin',
        timestamp: data.time,
        lastPrice: parseFloat(data.price),
        volume24h: parseFloat(data.vol)
      });
    }
    return null;
  }

  /**
   * Subscribe to a symbol on an existing connection
   */
  subscribeToSymbol(exchange, symbol) {
    const ws = this.connections.get(exchange);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscribeMessage = this.getSubscribeMessage(exchange, symbol);
    if (subscribeMessage) {
      ws.send(JSON.stringify(subscribeMessage));
    }
  }

  /**
   * Unsubscribe from a symbol
   */
  unsubscribeFromSymbol(exchange, symbol) {
    const ws = this.connections.get(exchange);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const unsubscribeMessage = this.getUnsubscribeMessage(exchange, symbol);
    if (unsubscribeMessage) {
      ws.send(JSON.stringify(unsubscribeMessage));
    }
  }

  /**
   * Get subscribe message format for each exchange
   */
  getSubscribeMessage(exchange, symbol) {
    const normalizedSymbol = this.normalizeSymbolForExchange(exchange, symbol);
    
    switch (exchange.toLowerCase()) {
      case 'binance':
        return {
          method: 'SUBSCRIBE',
          params: [`${normalizedSymbol.toLowerCase()}@ticker`],
          id: Date.now()
        };
      case 'coinbase':
        return {
          type: 'subscribe',
          product_ids: [normalizedSymbol],
          channels: ['ticker']
        };
      case 'kraken':
        return {
          event: 'subscribe',
          pair: [normalizedSymbol],
          subscription: { name: 'ticker' }
        };
      default:
        return null;
    }
  }

  /**
   * Get unsubscribe message format for each exchange
   */
  getUnsubscribeMessage(exchange, symbol) {
    const normalizedSymbol = this.normalizeSymbolForExchange(exchange, symbol);
    
    switch (exchange.toLowerCase()) {
      case 'binance':
        return {
          method: 'UNSUBSCRIBE',
          params: [`${normalizedSymbol.toLowerCase()}@ticker`],
          id: Date.now()
        };
      case 'coinbase':
        return {
          type: 'unsubscribe',
          product_ids: [normalizedSymbol],
          channels: ['ticker']
        };
      case 'kraken':
        return {
          event: 'unsubscribe',
          pair: [normalizedSymbol],
          subscription: { name: 'ticker' }
        };
      default:
        return null;
    }
  }

  /**
   * Normalize symbol format for each exchange
   */
  normalizeSymbolForExchange(exchange, symbol) {
    switch (exchange.toLowerCase()) {
      case 'binance':
        return symbol.replace('/', '');
      case 'coinbase':
        return symbol.replace('/', '-');
      case 'kraken':
        return symbol.replace('/', '');
      default:
        return symbol;
    }
  }

  /**
   * Normalize symbols from exchange format to standard format
   */
  normalizeKrakenSymbol(symbol) {
    // Kraken uses different symbol formats
    const mapping = {
      'XBT/USD': 'BTC/USD',
      'XBT/USDT': 'BTC/USDT'
    };
    return mapping[symbol] || symbol;
  }

  normalizeBitfinexSymbol(symbol) {
    // Bitfinex uses tBTCUSD format
    if (typeof symbol === 'string' && symbol.startsWith('t')) {
      const pair = symbol.slice(1);
      if (pair.endsWith('USD')) {
        const base = pair.slice(0, -3);
        return `${base}/USD`;
      }
    }
    return symbol;
  }

  /**
   * Resubscribe to all symbols after reconnection
   */
  resubscribeToSymbols(exchange) {
    for (const key of this.subscribers.keys()) {
      const [ex, symbol] = key.split('_');
      if (ex === exchange) {
        this.subscribeToSymbol(exchange, symbol);
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnect(exchange) {
    const attempts = this.reconnectAttempts.get(exchange) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${exchange}`);
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempts);
    this.reconnectAttempts.set(exchange, attempts + 1);

    console.log(`Scheduling reconnection to ${exchange} in ${delay}ms (attempt ${attempts + 1})`);
    
    setTimeout(() => {
      if (!this.connections.has(exchange)) {
        this.connect(exchange);
      }
    }, delay);
  }

  /**
   * Notify all subscribers of new market data
   */
  notifySubscribers(exchange, symbol, marketData) {
    const key = `${exchange}_${symbol}`;
    const subscribers = this.subscribers.get(key);
    
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(marketData);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  /**
   * Simple event emitter for connection events
   */
  emit(event, data) {
    // This could be enhanced with a proper event emitter
    console.log(`WebSocket event: ${event}`, data);
  }

  /**
   * Get connection status
   */
  getConnectionStatus() {
    const status = {};
    for (const [exchange, ws] of this.connections.entries()) {
      status[exchange] = {
        connected: ws.readyState === WebSocket.OPEN,
        readyState: ws.readyState,
        subscribers: Array.from(this.subscribers.keys())
          .filter(key => key.startsWith(exchange))
          .length
      };
    }
    return status;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
