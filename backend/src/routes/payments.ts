/**
 * Payment Processing Routes
 * Handle PayPal USD and crypto payment operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import paypalService from '../services/paypal-service';
import pythService from '../services/pyth-service';
import blockscoutService from '../services/blockscout-service';

export function createPaymentRoutes(): Router {
  const router = Router();

  // Create PayPal payment
  router.post('/paypal/create', [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
    body('currency').isIn(['USD', 'PYUSD']).withMessage('Currency must be USD or PYUSD'),
    body('description').optional().isString().isLength({ max: 255 }),
    body('recipientEmail').optional().isEmail()
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, currency, description, recipientEmail } = req.body;

      const payment = await paypalService.createOrder(amount, currency, {
        description,
        recipientEmail
      });

      res.json({
        success: true,
        payment,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Execute PayPal payment
  router.post('/paypal/execute', [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('payerId').optional().isString()
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { orderId, payerId } = req.body;

      const result = await paypalService.captureOrder(orderId);

      res.json({
        success: true,
        result,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Get PYUSD balance
  router.get('/paypal/pyusd/balance', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const balance = await paypalService.getPYUSDBalance();

      res.json({
        balance,
        currency: 'PYUSD',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Swap PYUSD on Uniswap
  router.post('/paypal/pyusd/swap', [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
    body('targetToken').notEmpty().withMessage('Target token is required'),
    body('slippage').optional().isFloat({ min: 0.1, max: 50 }).withMessage('Slippage must be between 0.1 and 50')
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { amount, targetToken, slippage = 1.0 } = req.body;

      const swapResult = await paypalService.swapPYUSDOnUniswap(amount, targetToken, slippage);

      res.json({
        success: true,
        swap: swapResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Get payment history
  router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { walletAddress, limit = 50, offset = 0 } = req.query;

      if (walletAddress && typeof walletAddress === 'string') {
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          return res.status(400).json({
            error: 'Invalid wallet address format'
          });
        }
      }

      // This would typically query the database for payment history
      // For now, return empty array
      res.json({
        payments: [],
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: 0
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Get payment status
  router.get('/:paymentId/status', [
    param('paymentId').notEmpty().withMessage('Payment ID is required')
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { paymentId } = req.params;

      // Check if it's a transaction hash (crypto payment)
      if (/^0x[a-fA-F0-9]{64}$/.test(paymentId)) {
        const transaction = await blockscoutService.getTransaction(paymentId);
        
        if (!transaction) {
          return res.status(404).json({
            error: 'Transaction not found'
          });
        }

        return res.json({
          id: paymentId,
          type: 'crypto',
          status: transaction.status === '1' ? 'completed' : 'failed',
          confirmations: transaction.confirmations,
          blockNumber: transaction.block_number,
          timestamp: transaction.timestamp
        });
      }

      // Otherwise, check PayPal payment status
      // This would query the database for PayPal payment status
      res.json({
        id: paymentId,
        type: 'paypal',
        status: 'pending',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  return router;
}