/**
 * API Client for PAYMINT Backend
 * Handles communication with the PAYMINT backend server
 */

const API_BASE_URL = 'http://localhost:3000/api';

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Health check
   */
  async checkHealth() {
    return this.request('/health');
  }

  /**
   * Create PayPal payment
   */
  async createPayPalPayment(amount: number, currency: string, description?: string) {
    return this.request('/payments/paypal/create', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, description })
    });
  }

  /**
   * Execute PayPal payment
   */
  async executePayPalPayment(orderId: string, payerId?: string) {
    return this.request('/payments/paypal/execute', {
      method: 'POST',
      body: JSON.stringify({ orderId, payerId })
    });
  }

  /**
   * Get PYUSD balance
   */
  async getPYUSDBalance(walletAddress: string) {
    return this.request(`/payments/paypal/pyusd/balance?walletAddress=${walletAddress}`);
  }

  /**
   * Create encrypted gift card
   */
  async createGiftCard(
    amount: number,
    currency: string,
    recipientAddress: string,
    senderAddress: string,
    message?: string
  ) {
    return this.request('/gift-cards/create', {
      method: 'POST',
      body: JSON.stringify({
        amount,
        currency,
        recipientAddress,
        senderAddress,
        message
      })
    });
  }

  /**
   * Redeem gift card
   */
  async redeemGiftCard(giftCardId: string, walletAddress: string) {
    return this.request(`/gift-cards/${giftCardId}/redeem`, {
      method: 'POST',
      body: JSON.stringify({ walletAddress })
    });
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string) {
    return this.request(`/payments/${paymentId}/status`);
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(walletAddress?: string, limit = 50, offset = 0) {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    if (walletAddress) {
      params.append('walletAddress', walletAddress);
    }

    return this.request(`/payments/history?${params.toString()}`);
  }
}

// Singleton instance
export const apiClient = new APIClient();