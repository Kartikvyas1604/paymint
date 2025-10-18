/**
 * PAYMINT Backend Service Tests
 * 
 * Unit tests for PayPal integration service
 * Tests PYUSD transactions, balance checks, payment processing
 * Required for ETHGlobal bounty submission ($10K PayPal bounty)
 */

import { PayPalService } from '../../src/services/paypal.service';
import nock from 'nock';

describe('PayPalService', () => {
  let paypalService: PayPalService;
  
  beforeEach(() => {
    paypalService = new PayPalService();
    
    // Mock PayPal API endpoints
    nock('https://api.paypal.com')
      .persist()
      .post('/v1/oauth2/token')
      .reply(200, {
        access_token: 'mock_access_token',
        token_type: 'Bearer',
        expires_in: 3600
      });
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('PYUSD Balance Operations', () => {
    test('should get PYUSD balance successfully', async () => {
      // Mock balance API
      nock('https://api.paypal.com')
        .get('/v1/reporting/balances')
        .reply(200, {
          balances: [{
            currency: 'PYUSD',
            primary: true,
            total_balance: {
              currency_code: 'PYUSD',
              value: '150.00'
            },
            available_balance: {
              currency_code: 'PYUSD',
              value: '150.00'
            }
          }]
        });

      const balance = await paypalService.getPYUSDBalance();
      
      expect(balance).toBeDefined();
      expect(balance.currency).toBe('PYUSD');
      expect(balance.available).toBe(150.00);
      expect(balance.total).toBe(150.00);
    });

    test('should handle insufficient PYUSD balance', async () => {
      // Mock insufficient balance
      nock('https://api.paypal.com')
        .get('/v1/reporting/balances')
        .reply(200, {
          balances: [{
            currency: 'PYUSD',
            primary: true,
            total_balance: {
              currency_code: 'PYUSD',
              value: '5.00'
            },
            available_balance: {
              currency_code: 'PYUSD',
              value: '5.00'
            }
          }]
        });

      const balance = await paypalService.getPYUSDBalance();
      const hasSufficientBalance = paypalService.hasSufficientBalance(balance, 50.00);
      
      expect(hasSufficientBalance).toBe(false);
    });
  });

  describe('PYUSD Payment Processing', () => {
    test('should create PYUSD payment successfully', async () => {
      const mockPayment = {
        id: 'PAYID-MOCK123',
        state: 'approved',
        payer: {
          payment_method: 'pyusd'
        },
        transactions: [{
          amount: {
            total: '25.99',
            currency: 'PYUSD'
          },
          item_list: {
            items: [{
              name: 'Amazon Gift Card',
              quantity: '1',
              price: '25.99',
              currency: 'PYUSD'
            }]
          }
        }]
      };

      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .reply(201, mockPayment);

      const paymentData = {
        amount: 25.99,
        currency: 'PYUSD',
        description: 'Amazon Gift Card Purchase',
        recipientType: 'merchant'
      };

      const result = await paypalService.createPYUSDPayment(paymentData);
      
      expect(result).toBeDefined();
      expect(result.id).toBe('PAYID-MOCK123');
      expect(result.state).toBe('approved');
      expect(result.transactions[0].amount.total).toBe('25.99');
      expect(result.transactions[0].amount.currency).toBe('PYUSD');
    });

    test('should handle payment creation failure', async () => {
      // Mock payment failure
      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .reply(400, {
          name: 'INVALID_REQUEST',
          message: 'Request is not well-formed, syntactically incorrect, or violates schema',
          information_link: 'https://developer.paypal.com/docs/api/payments/#errors'
        });

      const paymentData = {
        amount: -10, // Invalid amount
        currency: 'PYUSD',
        description: 'Invalid Payment Test',
        recipientType: 'merchant'
      };

      await expect(paypalService.createPYUSDPayment(paymentData))
        .rejects
        .toThrow('Request is not well-formed, syntactically incorrect, or violates schema');
    });
  });

  describe('Gift Card Purchase Flow', () => {
    test('should execute complete gift card purchase with PYUSD', async () => {
      // Mock successful payment
      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .reply(201, {
          id: 'PAYID-GIFTCARD123',
          state: 'approved',
          transactions: [{
            amount: {
              total: '50.00',
              currency: 'PYUSD'
            }
          }]
        });

      // Mock gift card provider API
      nock('https://api.giftcard-provider.com')
        .post('/v1/cards/amazon')
        .reply(200, {
          cardNumber: '1234-5678-9012-3456',
          securityCode: '7890',
          balance: 50.00,
          expiryDate: '12/2025'
        });

      const purchaseData = {
        platform: 'amazon',
        amount: 50.00,
        currency: 'PYUSD',
        userWallet: '0x123...abc'
      };

      const result = await paypalService.purchaseGiftCard(purchaseData);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.giftCard).toBeDefined();
      expect(result.giftCard.cardNumber).toBe('1234-5678-9012-3456');
      expect(result.giftCard.balance).toBe(50.00);
      expect(result.paymentId).toBe('PAYID-GIFTCARD123');
    });

    test('should handle gift card provider API failure', async () => {
      // Mock successful payment but failed gift card generation
      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .reply(201, {
          id: 'PAYID-FAILED456',
          state: 'approved'
        });

      nock('https://api.giftcard-provider.com')
        .post('/v1/cards/amazon')
        .reply(500, {
          error: 'Internal server error'
        });

      const purchaseData = {
        platform: 'amazon',
        amount: 25.00,
        currency: 'PYUSD',
        userWallet: '0x456...def'
      };

      const result = await paypalService.purchaseGiftCard(purchaseData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Gift card generation failed');
      // Payment should be refunded automatically
      expect(result.refunded).toBe(true);
    });
  });

  describe('Transaction History & Reporting', () => {
    test('should retrieve PYUSD transaction history', async () => {
      const mockTransactions = {
        transaction_details: [
          {
            transaction_info: {
              transaction_id: 'TXN123',
              transaction_amount: {
                currency_code: 'PYUSD',
                value: '25.99'
              },
              transaction_status: 'S',
              transaction_subject: 'Amazon Gift Card'
            },
            payer_info: {
              payer_name: {
                given_name: 'Test',
                surname: 'User'
              }
            }
          }
        ]
      };

      nock('https://api.paypal.com')
        .get('/v1/reporting/transactions')
        .query(true)
        .reply(200, mockTransactions);

      const startDate = new Date('2023-10-01');
      const endDate = new Date('2023-10-31');
      
      const history = await paypalService.getPYUSDTransactionHistory(startDate, endDate);
      
      expect(history).toBeDefined();
      expect(history.transactions).toHaveLength(1);
      expect(history.transactions[0].id).toBe('TXN123');
      expect(history.transactions[0].amount).toBe(25.99);
      expect(history.transactions[0].currency).toBe('PYUSD');
      expect(history.transactions[0].status).toBe('SUCCESS');
    });

    test('should generate payment analytics for bounty reporting', async () => {
      // Mock analytics data for ETHGlobal submission
      const mockAnalytics = {
        summary: {
          total_transactions: 142,
          total_volume_pyusd: '2847.50',
          successful_transactions: 139,
          failed_transactions: 3,
          avg_transaction_amount: '20.05'
        },
        platform_breakdown: {
          amazon: { count: 89, volume: '1789.23' },
          netflix: { count: 28, volume: '559.72' },
          dominos: { count: 25, volume: '498.55' }
        }
      };

      nock('https://api.paypal.com')
        .get('/v1/reporting/analytics')
        .query(true)
        .reply(200, mockAnalytics);

      const analytics = await paypalService.getPaymentAnalytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.totalTransactions).toBe(142);
      expect(analytics.totalVolume).toBe(2847.50);
      expect(analytics.successRate).toBeCloseTo(97.89, 2);
      expect(analytics.platformBreakdown).toBeDefined();
      expect(analytics.platformBreakdown.amazon.count).toBe(89);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    test('should handle PayPal API rate limiting', async () => {
      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .reply(429, {
          error: 'RATE_LIMIT_REACHED',
          error_description: 'Too many requests'
        });

      const paymentData = {
        amount: 10.00,
        currency: 'PYUSD',
        description: 'Rate limit test',
        recipientType: 'merchant'
      };

      await expect(paypalService.createPYUSDPayment(paymentData))
        .rejects
        .toThrow('Rate limit exceeded');
    });

    test('should handle network connectivity issues', async () => {
      // Simulate network error
      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .replyWithError('ECONNRESET');

      const paymentData = {
        amount: 15.00,
        currency: 'PYUSD',
        description: 'Network error test',
        recipientType: 'merchant'
      };

      await expect(paypalService.createPYUSDPayment(paymentData))
        .rejects
        .toThrow('Network error');
    });

    test('should validate PYUSD amount limits', async () => {
      // Test minimum amount validation
      expect(() => paypalService.validatePYUSDAmount(0.99))
        .toThrow('Minimum PYUSD amount is $1.00');

      // Test maximum amount validation  
      expect(() => paypalService.validatePYUSDAmount(10001))
        .toThrow('Maximum PYUSD amount is $10,000.00');

      // Test valid amount
      expect(() => paypalService.validatePYUSDAmount(50.00))
        .not.toThrow();
    });
  });

  describe('Security & Compliance', () => {
    test('should encrypt sensitive gift card data', async () => {
      const mockGiftCard = {
        cardNumber: '1234-5678-9012-3456',
        securityCode: '7890',
        expiryDate: '12/2025'
      };

      const encrypted = paypalService.encryptGiftCardData(mockGiftCard);
      
      expect(encrypted).toBeDefined();
      expect(encrypted).not.toContain('1234-5678-9012-3456');
      expect(encrypted).not.toContain('7890');
      
      // Should be able to decrypt
      const decrypted = paypalService.decryptGiftCardData(encrypted);
      expect(decrypted.cardNumber).toBe('1234-5678-9012-3456');
      expect(decrypted.securityCode).toBe('7890');
    });

    test('should log all PYUSD transactions for audit trail', async () => {
      const logSpy = jest.spyOn(console, 'log');
      
      nock('https://api.paypal.com')
        .post('/v1/payments/payment')
        .reply(201, {
          id: 'AUDIT-TEST123',
          state: 'approved'
        });

      const paymentData = {
        amount: 30.00,
        currency: 'PYUSD',
        description: 'Audit test payment',
        recipientType: 'merchant'
      };

      await paypalService.createPYUSDPayment(paymentData);
      
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('PYUSD_PAYMENT_CREATED'),
        expect.objectContaining({
          paymentId: 'AUDIT-TEST123',
          amount: 30.00,
          currency: 'PYUSD'
        })
      );
      
      logSpy.mockRestore();
    });
  });
});