/**
 * Gift Card Management Routes
 * Handle gift card creation, encryption, and redemption
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import litService from '../services/lit-service';
import database from '../database/db';

export function createGiftCardRoutes(): Router {
  const router = Router();

  // Create encrypted gift card
  router.post('/create', [
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0.01'),
    body('currency').isIn(['USD', 'PYUSD', 'ETH', 'BTC']).withMessage('Invalid currency'),
    body('recipientAddress').isEthereumAddress().withMessage('Valid recipient wallet address required'),
    body('senderAddress').isEthereumAddress().withMessage('Valid sender wallet address required'),
    body('expirationHours').optional().isInt({ min: 1, max: 8760 }).withMessage('Expiration must be 1-8760 hours'),
    body('message').optional().isString().isLength({ max: 500 }).withMessage('Message too long')
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { 
        amount, 
        currency, 
        recipientAddress, 
        senderAddress, 
        expirationHours,
        message 
      } = req.body;

      // Create gift card data
      const giftCardData = {
        id: `gc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount,
        currency,
        recipient: recipientAddress,
        sender: senderAddress,
        message: message || '',
        createdAt: new Date().toISOString(),
        expiresAt: expirationHours ? 
          new Date(Date.now() + (expirationHours * 3600000)).toISOString() : 
          null,
        status: 'active'
      };

      // Encrypt the gift card data using Lit Protocol
      const encryptionResult = await litService.encryptGiftCardData(
        giftCardData,
        recipientAddress,
        expirationHours
      );

      // Store gift card in database
      await database.run(
        `INSERT INTO gift_cards 
         (gift_card_id, amount, currency, sender_wallet, recipient_wallet, 
          encrypted_data, lit_access_conditions, status, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
        [
          giftCardData.id,
          amount,
          currency,
          senderAddress,
          recipientAddress,
          encryptionResult.ciphertext,
          JSON.stringify(encryptionResult.accessControlConditions),
          'active',
          expirationHours ? new Date(Date.now() + (expirationHours * 3600000)).toISOString() : null
        ]
      );

      res.json({
        success: true,
        giftCard: {
          id: giftCardData.id,
          amount,
          currency,
          recipient: recipientAddress,
          encrypted: true,
          dataHash: encryptionResult.dataToEncryptHash,
          expiresAt: giftCardData.expiresAt
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Get user's gift cards
  router.get('/wallet/:address', [
    param('address').isEthereumAddress().withMessage('Valid wallet address required')
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { address } = req.params;
      const { type = 'received' } = req.query; // 'sent' or 'received'

      const column = type === 'sent' ? 'sender_wallet' : 'recipient_wallet';
      
      const giftCards = await database.all(
        `SELECT gift_card_id, amount, currency, sender_wallet, recipient_wallet, 
                status, created_at, expires_at, redeemed_at
         FROM gift_cards 
         WHERE ${column} = ? AND (expires_at IS NULL OR expires_at > datetime('now'))
         ORDER BY created_at DESC
         LIMIT 50`,
        [address.toLowerCase()]
      );

      res.json({
        giftCards: giftCards.map((card: any) => ({
          id: card.gift_card_id,
          amount: parseFloat(card.amount),
          currency: card.currency,
          sender: card.sender_wallet,
          recipient: card.recipient_wallet,
          status: card.status,
          createdAt: card.created_at,
          expiresAt: card.expires_at,
          redeemedAt: card.redeemed_at
        })),
        type,
        address,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Decrypt and view gift card
  router.post('/:giftCardId/decrypt', [
    param('giftCardId').notEmpty().withMessage('Gift card ID is required'),
    body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required')
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { giftCardId } = req.params;
      const { walletAddress } = req.body;

      // Get gift card from database
      const giftCard = await database.get(
        `SELECT * FROM gift_cards WHERE gift_card_id = ?`,
        [giftCardId]
      );

      if (!giftCard) {
        return res.status(404).json({
          error: 'Gift card not found'
        });
      }

      // Check if expired
      if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
        return res.status(410).json({
          error: 'Gift card has expired'
        });
      }

      // Check if already redeemed
      if (giftCard.status === 'redeemed') {
        return res.status(410).json({
          error: 'Gift card has already been redeemed'
        });
      }

      // Decrypt the gift card data
      const accessConditions = JSON.parse(giftCard.lit_access_conditions);
      
      const decryptionResult = await litService.decryptGiftCardData(
        giftCard.encrypted_data,
        '', // dataToEncryptHash would be stored separately in production
        accessConditions,
        walletAddress
      );

      if (!decryptionResult.verified) {
        return res.status(403).json({
          error: 'Access denied - you do not have permission to view this gift card'
        });
      }

      res.json({
        success: true,
        giftCard: {
          id: giftCard.gift_card_id,
          data: decryptionResult.decryptedData,
          amount: parseFloat(giftCard.amount),
          currency: giftCard.currency,
          status: giftCard.status
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  // Redeem gift card
  router.post('/:giftCardId/redeem', [
    param('giftCardId').notEmpty().withMessage('Gift card ID is required'),
    body('walletAddress').isEthereumAddress().withMessage('Valid wallet address required'),
    body('redeemAddress').optional().isEthereumAddress().withMessage('Valid redeem address required')
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { giftCardId } = req.params;
      const { walletAddress, redeemAddress } = req.body;

      // Get gift card from database
      const giftCard = await database.get(
        `SELECT * FROM gift_cards WHERE gift_card_id = ?`,
        [giftCardId]
      );

      if (!giftCard) {
        return res.status(404).json({
          error: 'Gift card not found'
        });
      }

      // Verify access permissions
      if (giftCard.recipient_wallet.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(403).json({
          error: 'Only the recipient can redeem this gift card'
        });
      }

      // Check if expired
      if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
        return res.status(410).json({
          error: 'Gift card has expired'
        });
      }

      // Check if already redeemed
      if (giftCard.status === 'redeemed') {
        return res.status(410).json({
          error: 'Gift card has already been redeemed'
        });
      }

      // Mark as redeemed
      await database.run(
        `UPDATE gift_cards 
         SET status = 'redeemed', redeemed_at = datetime('now'), redeemed_by = ?
         WHERE gift_card_id = ?`,
        [redeemAddress || walletAddress, giftCardId]
      );

      res.json({
        success: true,
        message: 'Gift card redeemed successfully',
        giftCard: {
          id: giftCardId,
          amount: parseFloat(giftCard.amount),
          currency: giftCard.currency,
          redeemedAt: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      next(error);
    }
  });

  return router;
}