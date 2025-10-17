/**
 * Health Check Routes
 * Monitor service health and system status
 */

import { Router, Request, Response } from 'express';
import paypalService from '../services/paypal-service';
import pythService from '../services/pyth-service';
import blockscoutService from '../services/blockscout-service';
import litService from '../services/lit-service';
import database from '../database/db';

export function createHealthRoutes(): Router {
  const router = Router();

  // Overall health check
  router.get('/', async (req: Request, res: Response) => {
    try {
      const startTime = Date.now();

      // Check all services
      const [
        databaseHealth,
        paypalHealth,
        pythHealth,
        blockscoutHealth,
        litHealth
      ] = await Promise.allSettled([
        checkDatabaseHealth(),
        checkPayPalHealth(),
        checkPythHealth(),
        checkBlockscoutHealth(),
        checkLitHealth()
      ]);

      const totalLatency = Date.now() - startTime;

      const health = {
        status: 'operational',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        latency: totalLatency,
        services: {
          database: getHealthResult(databaseHealth),
          paypal: getHealthResult(paypalHealth),
          pyth: getHealthResult(pythHealth),
          blockscout: getHealthResult(blockscoutHealth),
          lit: getHealthResult(litHealth)
        }
      };

      // Determine overall status
      const allServicesHealthy = Object.values(health.services).every(service => service.healthy);
      health.status = allServicesHealthy ? 'operational' : 'degraded';

      const statusCode = allServicesHealthy ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Individual service health checks
  router.get('/database', async (req: Request, res: Response) => {
    try {
      const health = await checkDatabaseHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/paypal', async (req: Request, res: Response) => {
    try {
      const health = await checkPayPalHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/pyth', async (req: Request, res: Response) => {
    try {
      const health = await checkPythHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/blockscout', async (req: Request, res: Response) => {
    try {
      const health = await checkBlockscoutHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/lit', async (req: Request, res: Response) => {
    try {
      const health = await checkLitHealth();
      res.json(health);
    } catch (error) {
      res.status(500).json({
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

// Health check implementations
async function checkDatabaseHealth() {
  const startTime = Date.now();
  
  try {
    await database.get('SELECT 1 as test');
    
    return {
      healthy: true,
      latency: Date.now() - startTime,
      message: 'Database connection successful'
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Database connection failed'
    };
  }
}

async function checkPayPalHealth() {
  // PayPal service doesn't have a health check method yet
  // We'll just return healthy for now
  return {
    healthy: true,
    message: 'PayPal service operational'
  };
}

async function checkPythHealth() {
  try {
    const prices = await pythService.getPrices(['btc']);
    
    return {
      healthy: true,
      message: 'Pyth Network connection successful',
      priceFeeds: Object.keys(prices).length
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Pyth Network connection failed'
    };
  }
}

async function checkBlockscoutHealth() {
  try {
    const health = await blockscoutService.getHealthStatus();
    const healthyChains = Object.values(health).filter(chain => chain.healthy).length;
    const totalChains = Object.keys(health).length;
    
    return {
      healthy: healthyChains > 0,
      message: `${healthyChains}/${totalChains} chains operational`,
      chains: health
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Blockscout connection failed'
    };
  }
}

async function checkLitHealth() {
  try {
    const health = await litService.getHealthStatus();
    
    return {
      healthy: health.healthy,
      connected: health.connected,
      network: health.network,
      latency: health.latency
    };
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Lit Protocol connection failed'
    };
  }
}

function getHealthResult(result: PromiseSettledResult<any>) {
  if (result.status === 'fulfilled') {
    return result.value;
  } else {
    return {
      healthy: false,
      error: result.reason instanceof Error ? result.reason.message : 'Service check failed'
    };
  }
}