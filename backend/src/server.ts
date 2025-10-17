/**
 * PAYMINT Express Server
 * Main API server handling all backend operations
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import config, { validateConfig } from './config';
import database from './database/db';

// Import services
import paypalService from './services/paypal-service';
import pythService from './services/pyth-service';
import blockscoutService from './services/blockscout-service';
import litService from './services/lit-service';

// Import route handlers
import { createPaymentRoutes } from './routes/payments';
import { createGiftCardRoutes } from './routes/gift-cards';
import { createHealthRoutes } from './routes/health';
import { createWebhookRoutes } from './routes/webhooks';

// Error types
interface APIError extends Error {
  statusCode?: number;
  code?: string;
}

class PaymintServer {
  private app: Application;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Configure Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "https://api.paypal.com", "https://hermes.pyth.network"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://paymint.app', 'https://www.paymint.app']
        : ['http://localhost:3000', 'chrome-extension://*'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.maxRequests,
      message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
        
        // Log to database for analytics
        database.run(
          `INSERT INTO system_logs (level, message, metadata, timestamp) 
           VALUES (?, ?, ?, datetime('now'))`,
          [
            'info',
            `API Request: ${req.method} ${req.path}`,
            JSON.stringify({
              method: req.method,
              path: req.path,
              statusCode: res.statusCode,
              duration,
              userAgent: req.get('User-Agent'),
              ip: req.ip
            })
          ]
        ).catch(err => console.warn('Failed to log request:', err));
      });
      
      next();
    });
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // API base route
    this.app.get('/api', (req: Request, res: Response) => {
      res.json({
        message: 'PAYMINT API v1.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        bounties: {
          paypal_usd: '$10,000',
          blockscout: '$10,000', 
          pyth_network: '$5,000',
          lit_protocol: '$5,000'
        }
      });
    });

    // Health check routes
    this.app.use('/api/health', createHealthRoutes());

    // Payment processing routes  
    this.app.use('/api/payments', createPaymentRoutes());

    // Gift card management routes
    this.app.use('/api/gift-cards', createGiftCardRoutes());

    // Webhook handlers
    this.app.use('/api/webhooks', createWebhookRoutes());

    // Extension-specific routes
    this.setupExtensionRoutes();

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        availableRoutes: [
          '/api',
          '/api/health',
          '/api/payments',
          '/api/gift-cards',
          '/api/webhooks'
        ]
      });
    });
  }

  /**
   * Setup Chrome extension specific routes
   */
  private setupExtensionRoutes(): void {
    // Get user wallet balance across chains
    this.app.get('/api/wallet/:address/balance', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { address } = req.params;
        const { chain } = req.query;

        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
          return res.status(400).json({
            error: 'Invalid wallet address'
          });
        }

        const chainId = chain ? parseInt(chain as string) : undefined;
        const balances = await blockscoutService.getTokenBalances(address, chainId);

        res.json({
          address,
          chain: chainId || 'all',
          balances,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        next(error);
      }
    });

    // Monitor transaction status
    this.app.get('/api/transaction/:hash/status', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { hash } = req.params;
        const { chain } = req.query;

        if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
          return res.status(400).json({
            error: 'Invalid transaction hash'
          });
        }

        const chainId = chain ? parseInt(chain as string) : undefined;
        const transaction = await blockscoutService.getTransaction(hash, chainId);

        if (!transaction) {
          return res.status(404).json({
            error: 'Transaction not found'
          });
        }

        res.json({
          hash: transaction.hash,
          status: transaction.status === '1' ? 'confirmed' : 'failed',
          confirmations: transaction.confirmations,
          blockNumber: transaction.block_number,
          timestamp: transaction.timestamp,
          from: transaction.from,
          to: transaction.to,
          value: transaction.value
        });

      } catch (error) {
        next(error);
      }
    });

    // Get real-time crypto prices
    this.app.get('/api/prices', async (req: Request, res: Response, next: NextFunction) => {
      try {
        const prices = await pythService.getAllPrices();
        
        res.json({
          prices: Object.entries(prices).map(([symbol, data]) => ({
            symbol: symbol.toUpperCase(),
            price: data.price,
            confidence: data.confidence,
            publishTime: data.publishTime,
            status: data.status
          })),
          timestamp: new Date().toISOString(),
          source: 'Pyth Network'
        });

      } catch (error) {
        next(error);
      }
    });

    // Encrypt gift card data
    this.app.post('/api/encrypt', [
      body('data').notEmpty().withMessage('Data is required'),
      body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
      body('expirationHours').optional().isInt({ min: 1, max: 8760 })
    ], async (req: Request, res: Response, next: NextFunction) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
          });
        }

        const { data, walletAddress, expirationHours } = req.body;

        const result = await litService.encryptGiftCardData(
          data,
          walletAddress,
          expirationHours
        );

        res.json({
          encrypted: true,
          ciphertext: result.ciphertext,
          dataHash: result.dataToEncryptHash,
          accessConditions: result.accessControlConditions,
          expiresAt: expirationHours ? 
            new Date(Date.now() + (expirationHours * 3600000)).toISOString() : 
            null
        });

      } catch (error) {
        next(error);
      }
    });
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Async error wrapper
    this.app.use((error: APIError, req: Request, res: Response, next: NextFunction) => {
      // Log error
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        path: req.path,
        method: req.method,
        body: req.body,
        timestamp: new Date().toISOString()
      });

      // Log to database
      database.run(
        `INSERT INTO system_logs (level, message, metadata, timestamp) 
         VALUES (?, ?, ?, datetime('now'))`,
        [
          'error',
          `API Error: ${error.message}`,
          JSON.stringify({
            error: error.message,
            stack: error.stack,
            path: req.path,
            method: req.method,
            statusCode: error.statusCode || 500
          })
        ]
      ).catch(dbErr => console.warn('Failed to log error:', dbErr));

      // Send error response
      const statusCode = error.statusCode || 500;
      const isDevelopment = config.environment === 'development';

      res.status(statusCode).json({
        error: error.message || 'Internal Server Error',
        code: error.code || 'INTERNAL_ERROR',
        path: req.path,
        timestamp: new Date().toISOString(),
        ...(isDevelopment && { stack: error.stack })
      });
    });
  }

  /**
   * Initialize all services
   */
  private async initializeServices(): Promise<void> {
    console.log('🚀 Initializing PAYMINT services...');

    try {
      // Initialize database
      await database.initialize();
      console.log('✅ Database initialized');

      // Initialize Lit Protocol
      await litService.initialize();
      console.log('✅ Lit Protocol initialized');

      // Initialize Pyth Network (start price monitoring)
      await pythService.startPriceMonitoring();
      console.log('✅ Pyth Network price monitoring started');

      // Test PayPal connection
      const paypalHealth = await paypalService.getHealthStatus();
      console.log(`✅ PayPal service: ${paypalHealth.healthy ? 'Connected' : 'Disconnected'}`);

      // Test Blockscout connections
      const blockscoutHealth = await blockscoutService.getHealthStatus();
      const healthyChains = Object.values(blockscoutHealth).filter(chain => chain.healthy).length;
      console.log(`✅ Blockscout: ${healthyChains}/${Object.keys(blockscoutHealth).length} chains healthy`);

      console.log('🎉 All services initialized successfully');

    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();

      // Initialize services
      await this.initializeServices();

      // Start HTTP server
      const server = this.app.listen(config.port, () => {
        console.log('\n🎯 PAYMINT Backend Server Started');
        console.log(`🌐 Server running on port ${config.port}`);
        console.log(`🏆 Targeting $30,000 in ETHGlobal bounties`);
        console.log(`💼 Environment: ${config.environment}`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
        console.log('\n📊 Bounty Targets:');
        console.log('   💰 PayPal USD Integration: $10,000');
        console.log('   🔍 Blockscout Multi-chain: $10,000');
        console.log('   📈 Pyth Network Oracles: $5,000');
        console.log('   🔐 Lit Protocol Encryption: $5,000');
        console.log('\n🔗 API Endpoints available at:');
        console.log(`   http://localhost:${config.port}/api`);
      });

      // Graceful shutdown handling
      const gracefulShutdown = async (signal: string) => {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);

        // Stop accepting new connections
        server.close(async () => {
          console.log('🔌 HTTP server closed');

          try {
            // Stop services
            await pythService.stopPriceMonitoring();
            await litService.disconnect();
            await database.close();

            console.log('✅ All services stopped gracefully');
            process.exit(0);
          } catch (error) {
            console.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        });

        // Force exit after 30 seconds
        setTimeout(() => {
          console.error('⚠️  Forced shutdown after 30 seconds');
          process.exit(1);
        }, 30000);
      };

      // Handle shutdown signals
      process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
      process.on('SIGINT', () => gracefulShutdown('SIGINT'));

      // Handle unhandled rejections
      process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        // Don't exit in production, just log
        if (config.environment === 'development') {
          process.exit(1);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Get Express app instance (for testing)
   */
  getApp(): Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new PaymintServer();
  server.start().catch(error => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}

export default PaymintServer;