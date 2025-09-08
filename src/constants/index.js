// Constants for LiquidityFlow AI
// API endpoints, configuration, and static data

// API Endpoints
export const API_ENDPOINTS = {
  // CoinGecko API
  COINGECKO: {
    BASE_URL: 'https://api.coingecko.com/api/v3',
    EXCHANGES: '/exchanges',
    TICKERS: '/exchanges/{id}/tickers',
    COINS: '/coins/markets',
    PRICE: '/simple/price'
  },
  
  // Exchange WebSocket URLs
  WEBSOCKETS: {
    BINANCE: 'wss://stream.binance.com:9443/ws',
    COINBASE: 'wss://ws-feed.pro.coinbase.com',
    KRAKEN: 'wss://ws.kraken.com',
    BITFINEX: 'wss://api-pub.bitfinex.com/ws/2',
    KUCOIN: 'wss://ws-api.kucoin.com/endpoint'
  },
  
  // Internal AI API (placeholder)
  AI_MODEL: {
    BASE_URL: '/api/ai',
    PREDICT_SLIPPAGE: '/predict-slippage',
    OPTIMIZE_ORDER_SIZE: '/optimize-order-size',
    ROUTE_OPTIMIZATION: '/route-optimization'
  }
};

// Supported Exchanges
export const EXCHANGES = [
  {
    id: 'binance',
    name: 'Binance',
    displayName: 'Binance',
    status: 'active',
    fees: { maker: 0.001, taker: 0.001 },
    minOrderSize: 10,
    maxOrderSize: 1000000,
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT', 'SOL/USDT']
  },
  {
    id: 'coinbase',
    name: 'Coinbase Pro',
    displayName: 'Coinbase',
    status: 'active',
    fees: { maker: 0.005, taker: 0.005 },
    minOrderSize: 10,
    maxOrderSize: 500000,
    supportedPairs: ['BTC/USD', 'ETH/USD', 'LTC/USD', 'BCH/USD']
  },
  {
    id: 'kraken',
    name: 'Kraken',
    displayName: 'Kraken',
    status: 'active',
    fees: { maker: 0.0016, taker: 0.0026 },
    minOrderSize: 10,
    maxOrderSize: 200000,
    supportedPairs: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'ADA/USD']
  },
  {
    id: 'bitfinex',
    name: 'Bitfinex',
    displayName: 'Bitfinex',
    status: 'active',
    fees: { maker: 0.001, taker: 0.002 },
    minOrderSize: 15,
    maxOrderSize: 750000,
    supportedPairs: ['BTC/USD', 'ETH/USD', 'LTC/USD']
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    displayName: 'KuCoin',
    status: 'active',
    fees: { maker: 0.001, taker: 0.001 },
    minOrderSize: 5,
    maxOrderSize: 300000,
    supportedPairs: ['BTC/USDT', 'ETH/USDT', 'KCS/USDT']
  }
];

// Trading Pairs
export const TRADING_PAIRS = [
  {
    symbol: 'BTC/USDT',
    baseAsset: 'BTC',
    quoteAsset: 'USDT',
    displayName: 'Bitcoin / Tether',
    minOrderSize: 0.001,
    priceDecimals: 2,
    quantityDecimals: 6
  },
  {
    symbol: 'ETH/USDT',
    baseAsset: 'ETH',
    quoteAsset: 'USDT',
    displayName: 'Ethereum / Tether',
    minOrderSize: 0.01,
    priceDecimals: 2,
    quantityDecimals: 4
  },
  {
    symbol: 'BNB/USDT',
    baseAsset: 'BNB',
    quoteAsset: 'USDT',
    displayName: 'Binance Coin / Tether',
    minOrderSize: 0.1,
    priceDecimals: 2,
    quantityDecimals: 2
  },
  {
    symbol: 'ADA/USDT',
    baseAsset: 'ADA',
    quoteAsset: 'USDT',
    displayName: 'Cardano / Tether',
    minOrderSize: 10,
    priceDecimals: 4,
    quantityDecimals: 0
  },
  {
    symbol: 'SOL/USDT',
    baseAsset: 'SOL',
    quoteAsset: 'USDT',
    displayName: 'Solana / Tether',
    minOrderSize: 0.1,
    priceDecimals: 2,
    quantityDecimals: 2
  }
];

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 29,
    period: 'month',
    features: [
      'Multi-exchange data aggregation',
      'Basic liquidity routing',
      'Up to 100 trades/month',
      'Email support',
      'Basic analytics'
    ],
    limits: {
      trades: 100,
      volume: 100000,
      exchanges: 3,
      aiPredictions: false,
      advancedAnalytics: false,
      customAlerts: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 79,
    period: 'month',
    popular: true,
    features: [
      'Everything in Basic',
      'AI-powered slippage minimization',
      'Predictive order sizing',
      'Up to 1,000 trades/month',
      'Priority support',
      'Advanced analytics',
      'Custom alerts'
    ],
    limits: {
      trades: 1000,
      volume: 1000000,
      exchanges: 8,
      aiPredictions: true,
      advancedAnalytics: true,
      customAlerts: true,
      riskAnalysis: false
    }
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 199,
    period: 'month',
    features: [
      'Everything in Pro',
      'Unlimited trades',
      'Advanced risk analysis',
      'Portfolio optimization',
      'Real-time market insights',
      'White-glove support',
      'Custom integrations',
      'Priority execution'
    ],
    limits: {
      trades: Infinity,
      volume: Infinity,
      exchanges: Infinity,
      aiPredictions: true,
      advancedAnalytics: true,
      customAlerts: true,
      riskAnalysis: true,
      portfolioOptimization: true,
      priorityExecution: true
    }
  }
};

// WebSocket Event Types
export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  TICKER: 'ticker',
  ORDERBOOK: 'orderbook',
  TRADE: 'trade',
  KLINE: 'kline'
};

// Trade Status
export const TRADE_STATUS = {
  PENDING: 'pending',
  ANALYZING: 'analyzing',
  ROUTING: 'routing',
  EXECUTING: 'executing',
  EXECUTED: 'executed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Order Types
export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP_LOSS: 'stop_loss',
  TAKE_PROFIT: 'take_profit'
};

// Time Intervals
export const TIME_INTERVALS = {
  '1m': '1 minute',
  '5m': '5 minutes',
  '15m': '15 minutes',
  '1h': '1 hour',
  '4h': '4 hours',
  '1d': '1 day',
  '1w': '1 week'
};

// Chart Colors
export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#06b6d4',
  light: '#f8fafc',
  dark: '#1e293b'
};

// Default Settings
export const DEFAULT_SETTINGS = {
  theme: 'light',
  currency: 'USD',
  notifications: {
    email: true,
    push: false,
    sms: false
  },
  trading: {
    defaultOrderSize: 1000,
    maxSlippage: 0.5,
    autoExecute: false,
    riskLevel: 'medium'
  },
  display: {
    showAdvancedMetrics: false,
    chartInterval: '1h',
    tablePageSize: 20
  }
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection error. Please try again.',
  API_ERROR: 'API service unavailable. Please try again later.',
  INVALID_CREDENTIALS: 'Invalid API credentials. Please check your settings.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for this trade.',
  ORDER_SIZE_TOO_SMALL: 'Order size is below minimum requirement.',
  ORDER_SIZE_TOO_LARGE: 'Order size exceeds maximum limit.',
  UNSUPPORTED_PAIR: 'Trading pair not supported on selected exchange.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait before trying again.',
  SUBSCRIPTION_LIMIT_REACHED: 'Subscription limit reached. Please upgrade your plan.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  TRADE_EXECUTED: 'Trade executed successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  EXCHANGE_CONNECTED: 'Exchange connected successfully!',
  SUBSCRIPTION_UPGRADED: 'Subscription upgraded successfully!'
};
