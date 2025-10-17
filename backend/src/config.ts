/**
 * PAYMINT Backend Configuration
 * Centralized configuration management for all services
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface Config {
  // Server
  port: number;
  nodeEnv: string;
  
  // Database
  databasePath: string;
  
  // PayPal
  paypal: {
    clientId: string;
    clientSecret: string;
    baseUrl: string;
    webhookId: string;
  };
  
  // Pyth Network
  pyth: {
    networkUrl: string;
    feedIds: {
      btc: string;
      eth: string;
      sol: string;
      usdc: string;
      pyusd: string;
    };
  };
  
  // Blockscout
  blockscout: {
    baseUrl: string;
    rpcUrls: {
      ethereum: string;
      base: string;
      polygon: string;
    };
  };
  
  // Lit Protocol
  lit: {
    network: string;
    apiKey: string;
  };
  
  // Gift Card APIs
  giftCards: {
    bitrefill: {
      apiKey: string;
      apiSecret: string;
    };
    reloadly: {
      clientId: string;
      clientSecret: string;
    };
  };
  
  // Security
  security: {
    jwtSecret: string;
    encryptionKey: string;
  };
  
  // Rate Limiting
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  
  // Logging
  logging: {
    level: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '../data/paymint.db'),
  
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
    webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
  },
  
  pyth: {
    networkUrl: process.env.PYTH_NETWORK_URL || 'https://hermes.pyth.network',
    feedIds: {
      btc: process.env.PYTH_BTC_FEED_ID || '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
      eth: process.env.PYTH_ETH_FEED_ID || '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
      sol: process.env.PYTH_SOL_FEED_ID || '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
      usdc: process.env.PYTH_USDC_FEED_ID || '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
      pyusd: process.env.PYTH_PYUSD_FEED_ID || '0x6ec879b1e9963de5ee97e9c8710b742d6228252a5e2ca12d4ae81d7fe5ee8c5d',
    },
  },
  
  blockscout: {
    baseUrl: process.env.BLOCKSCOUT_BASE_URL || 'https://blockscout.com',
    rpcUrls: {
      ethereum: process.env.ETHEREUM_RPC_URL || 'https://ethereum.publicnode.com',
      base: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
      polygon: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    },
  },
  
  lit: {
    network: process.env.LIT_NETWORK || 'cayenne',
    apiKey: process.env.LIT_API_KEY || '',
  },
  
  giftCards: {
    bitrefill: {
      apiKey: process.env.BITREFILL_API_KEY || '',
      apiSecret: process.env.BITREFILL_API_SECRET || '',
    },
    reloadly: {
      clientId: process.env.RELOADLY_CLIENT_ID || '',
      clientSecret: process.env.RELOADLY_CLIENT_SECRET || '',
    },
  },
  
  security: {
    jwtSecret: process.env.JWT_SECRET || 'fallback-secret-key-for-development-only',
    encryptionKey: process.env.ENCRYPTION_KEY || 'fallback-encryption-key-dev-only',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validation function to ensure required config exists
export function validateConfig(): void {
  const requiredFields = {
    'PayPal Client ID': config.paypal.clientId,
    'PayPal Client Secret': config.paypal.clientSecret,
    'JWT Secret': config.security.jwtSecret,
  };
  
  const missingFields = Object.entries(requiredFields)
    .filter(([, value]) => !value || value.length < 8)
    .map(([key]) => key);
  
  if (missingFields.length > 0 && config.nodeEnv === 'production') {
    throw new Error(`Missing required configuration: ${missingFields.join(', ')}`);
  }
  
  if (missingFields.length > 0 && config.nodeEnv === 'development') {
    console.warn(`⚠️  Missing configuration (dev mode): ${missingFields.join(', ')}`);
  }
}

export default config;