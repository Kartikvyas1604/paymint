/**
 * Webhook Routes
 * Handle incoming webhooks from PayPal and other services
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import paypalService from '../services/paypal-service';
import database from '../database/db';

export function createWebhookRoutes(): Router {
  const router = Router();

  // PayPal webhook handler
  router.post('/paypal', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const webhookData = req.body;
      
      console.log('📥 Received PayPal webhook:', {
        eventType: webhookData.event_type,
        resourceType: webhookData.resource_type,
        id: webhookData.id
      });

      // Verify webhook signature (in production)
      // const isValid = await paypalService.verifyWebhookSignature(req);
      // if (!isValid) {
      //   return res.status(401).json({ error: 'Invalid webhook signature' });
      // }

      // Process webhook based on event type
      switch (webhookData.event_type) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await handlePaymentCaptureCompleted(webhookData);
          break;
          
        case 'PAYMENT.CAPTURE.DENIED':
          await handlePaymentCaptureDenied(webhookData);
          break;
          
        case 'CHECKOUT.ORDER.APPROVED':
          await handleOrderApproved(webhookData);
          break;
          
        case 'BILLING.SUBSCRIPTION.CREATED':
          await handleSubscriptionCreated(webhookData);
          break;
          
        default:
          console.log(`ℹ️  Unhandled PayPal webhook event: ${webhookData.event_type}`);
      }

      // Log webhook to database
      await database.run(
        `INSERT INTO system_logs (level, message, metadata, timestamp) 
         VALUES (?, ?, ?, datetime('now'))`,
        [
          'info',
          `PayPal webhook: ${webhookData.event_type}`,
          JSON.stringify({
            eventType: webhookData.event_type,
            resourceType: webhookData.resource_type,
            resourceId: webhookData.resource?.id,
            webhookId: webhookData.id
          })
        ]
      );

      // Acknowledge webhook
      res.status(200).json({
        status: 'received',
        eventType: webhookData.event_type,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ PayPal webhook processing failed:', error);
      next(error);
    }
  });

  // Generic webhook endpoint for testing
  router.post('/test', [
    body('eventType').notEmpty().withMessage('Event type is required'),
    body('data').optional().isObject()
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { eventType, data } = req.body;

      console.log('🧪 Test webhook received:', {
        eventType,
        data: data || {}
      });

      // Log test webhook
      await database.run(
        `INSERT INTO system_logs (level, message, metadata, timestamp) 
         VALUES (?, ?, ?, datetime('now'))`,
        [
          'info',
          `Test webhook: ${eventType}`,
          JSON.stringify({ eventType, data: data || {} })
        ]
      );

      res.json({
        status: 'processed',
        eventType,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  return router;
}

// Webhook event handlers
async function handlePaymentCaptureCompleted(webhookData: any): Promise<void> {
  try {
    const payment = webhookData.resource;
    
    console.log('✅ Payment capture completed:', {
      id: payment.id,
      amount: payment.amount?.value,
      currency: payment.amount?.currency_code
    });

    // Update payment status in database
    await database.run(
      `UPDATE transactions 
       SET status = 'completed', completed_at = datetime('now'), 
           paypal_payment_id = ?, paypal_capture_id = ?
       WHERE paypal_order_id = ?`,
      [payment.id, payment.id, payment.supplementary_data?.related_ids?.order_id]
    );

    // If this was a gift card purchase, activate the gift card
    const transaction = await database.get(
      `SELECT * FROM transactions WHERE paypal_order_id = ?`,
      [payment.supplementary_data?.related_ids?.order_id]
    );

    if (transaction && transaction.transaction_type === 'gift_card_purchase') {
      await database.run(
        `UPDATE gift_cards SET status = 'active' WHERE gift_card_id = ?`,
        [transaction.gift_card_id]
      );
    }

  } catch (error) {
    console.error('❌ Failed to handle payment capture completed:', error);
    throw error;
  }
}

async function handlePaymentCaptureDenied(webhookData: any): Promise<void> {
  try {
    const payment = webhookData.resource;
    
    console.log('❌ Payment capture denied:', {
      id: payment.id,
      reason: payment.status_details?.reason
    });

    // Update payment status in database
    await database.run(
      `UPDATE transactions 
       SET status = 'failed', failed_at = datetime('now'),
           failure_reason = ?
       WHERE paypal_order_id = ?`,
      [
        payment.status_details?.reason || 'Payment denied',
        payment.supplementary_data?.related_ids?.order_id
      ]
    );

  } catch (error) {
    console.error('❌ Failed to handle payment capture denied:', error);
    throw error;
  }
}

async function handleOrderApproved(webhookData: any): Promise<void> {
  try {
    const order = webhookData.resource;
    
    console.log('👍 Order approved:', {
      id: order.id,
      status: order.status
    });

    // Update order status in database
    await database.run(
      `UPDATE transactions 
       SET status = 'approved', approved_at = datetime('now')
       WHERE paypal_order_id = ?`,
      [order.id]
    );

  } catch (error) {
    console.error('❌ Failed to handle order approved:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(webhookData: any): Promise<void> {
  try {
    const subscription = webhookData.resource;
    
    console.log('🔄 Subscription created:', {
      id: subscription.id,
      status: subscription.status
    });

    // Handle subscription creation if needed
    // This would be for recurring gift card features

  } catch (error) {
    console.error('❌ Failed to handle subscription created:', error);
    throw error;
  }
}