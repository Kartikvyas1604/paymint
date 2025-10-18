/**
 * Netflix Platform Integration
 * 
 * Handles detection, price parsing, and gift card application for Netflix.com
 * Supports subscription plans and gift card redemption flow.
 */

import { PlatformDetector, GiftCardData, CheckoutInfo } from './types';

export class NetflixPlatform implements PlatformDetector {
  readonly name = 'netflix';
  readonly displayName = 'Netflix';
  readonly supportedDomains = [
    'netflix.com', 'netflix.co.uk', 'netflix.de', 'netflix.fr',
    'netflix.it', 'netflix.es', 'netflix.ca', 'netflix.com.au',
    'netflix.co.jp', 'netflix.in'
  ];

  // Netflix-specific CSS selectors
  private readonly selectors = {
    checkout: {
      totalPrice: [
        '[data-uia="plan-price"]',
        '.price-display .currency-price',
        '.plan-price .amount',
        '.plan-selection-price'
      ],
      giftCardSection: [
        '[data-uia="gift-card-section"]',
        '.gift-card-redemption',
        '#gift-code-section',
        '.redeem-gift-container'
      ],
      giftCardInput: [
        '[data-uia="gift-code-input"]',
        'input[name="giftCode"]',
        '#gift-code-input',
        'input[placeholder*="gift"]'
      ],
      applyButton: [
        '[data-uia="redeem-gift-button"]',
        'button[data-uia="redeem-button"]',
        '.redeem-button',
        'button:contains("Redeem")'
      ]
    },
    plans: {
      planSelection: [
        '[data-uia="plan-selection-container"]',
        '.plan-selection-wrapper',
        '.planGrid'
      ],
      selectedPlan: [
        '[data-uia="plan-selection-option"][aria-checked="true"]',
        '.plan-option.selected',
        '.plan-selected'
      ]
    },
    signup: {
      paymentStep: [
        '[data-uia="payment-picker-container"]',
        '.payment-method-container',
        '.payment-picker'
      ],
      continueButton: [
        '[data-uia="payment-picker-continue"]',
        'button[data-uia="continue-button"]',
        '.btn-continue'
      ]
    }
  };

  /**
   * Detect if current page is Netflix signup or payment flow
   */
  isDetected(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Check if we're on a supported Netflix domain
    const isNetflixDomain = this.supportedDomains.some(domain => 
      hostname.includes(domain)
    );
    
    if (!isNetflixDomain) return false;
    
    // Check if we're on signup, payment, or gift card redemption pages
    const isRelevantPage = [
      '/signup',
      '/redeem',
      '/gift-redemption',
      '/payment',
      '/planform'
    ].some(path => pathname.includes(path));
    
    // Check for plan selection elements
    const hasPlanSelection = this.findElement(this.selectors.plans.planSelection) !== null;
    
    // Check for payment step
    const hasPaymentStep = this.findElement(this.selectors.signup.paymentStep) !== null;
    
    // Check for gift card section
    const hasGiftCardSection = this.findElement(this.selectors.checkout.giftCardSection) !== null;
    
    const detected = isRelevantPage || hasPlanSelection || hasPaymentStep || hasGiftCardSection;
    
    if (detected) {
      console.log('🎬 Netflix platform detected');
      console.log(`📍 Current URL: ${window.location.href}`);
    }
    
    return detected;
  }

  /**
   * Get checkout information from Netflix signup flow
   */
  getCheckoutInfo(): CheckoutInfo | null {
    try {
      const totalPrice = this.extractPlanPrice();
      
      if (!totalPrice) {
        console.warn('⚠️  Could not extract Netflix plan price');
        return null;
      }

      return {
        platform: this.name,
        totalAmount: totalPrice.amount,
        currency: totalPrice.currency,
        items: this.extractSelectedPlan(),
        checkoutUrl: window.location.href,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to get Netflix checkout info:', error);
      return null;
    }
  }

  /**
   * Extract plan price from Netflix page
   */
  private extractPlanPrice(): { amount: number; currency: string } | null {
    // Try to find selected plan price
    for (const selector of this.selectors.checkout.totalPrice) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || '';
        const parsed = this.parseNetflixPrice(priceText);
        if (parsed) return parsed;
      }
    }
    
    // Try to find price in selected plan
    const selectedPlan = this.findElement(this.selectors.plans.selectedPlan);
    if (selectedPlan) {
      const priceElements = selectedPlan.querySelectorAll('.price, .amount, [data-uia*="price"]');
      for (const element of priceElements) {
        const priceText = element.textContent || '';
        const parsed = this.parseNetflixPrice(priceText);
        if (parsed) return parsed;
      }
    }
    
    return null;
  }

  /**
   * Parse price text from Netflix (handles multiple currencies and formats)
   */
  private parseNetflixPrice(priceText: string): { amount: number; currency: string } | null {
    if (!priceText) return null;
    
    // Clean the price text
    const cleanText = priceText.replace(/\s+/g, ' ').trim();
    
    // Netflix price patterns
    const patterns = [
      // Standard formats: $15.99/month, £12.99/month
      /([£$€₹])(\d+(?:\.\d{2})?)\s*(?:\/|\s*per\s*|\s*)(?:month|mo|месяц)?/i,
      // Alternative formats: 15.99 USD/month
      /(\d+(?:\.\d{2})?)\s*([A-Z]{3})\s*(?:\/|\s*per\s*|\s*)(?:month|mo)?/i,
      // Simple formats: $15.99, €12.99
      /([£$€₹])(\d+(?:\.\d{2})?)/,
      // Numeric with currency after: 15.99 USD
      /(\d+(?:\.\d{2})?)\s*([A-Z]{3})/
    ];
    
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let amount: number;
        let currency: string;
        
        if (match[1] && match[2] && /[£$€₹]/.test(match[1])) {
          // Currency symbol first
          amount = parseFloat(match[2]);
          currency = this.getCurrencyFromSymbol(match[1]);
        } else if (match[1] && match[2] && /[A-Z]{3}/.test(match[2])) {
          // Amount first, currency code after
          amount = parseFloat(match[1]);
          currency = match[2];
        } else {
          continue;
        }
        
        if (isNaN(amount)) continue;
        
        console.log(`💰 Netflix price parsed: ${amount} ${currency}`);
        return { amount, currency };
      }
    }
    
    console.warn(`⚠️  Could not parse Netflix price: "${cleanText}"`);
    return null;
  }

  /**
   * Map currency symbols to currency codes
   */
  private getCurrencyFromSymbol(symbol: string): string {
    const mapping: { [key: string]: string } = {
      '$': 'USD',
      '£': 'GBP', 
      '€': 'EUR',
      '₹': 'INR'
    };
    return mapping[symbol] || 'USD';
  }

  /**
   * Extract selected Netflix plan information
   */
  private extractSelectedPlan(): any[] {
    const selectedPlan = this.findElement(this.selectors.plans.selectedPlan);
    
    if (selectedPlan) {
      const titleElement = selectedPlan.querySelector('[data-uia*="plan"], .plan-title, .plan-name');
      const title = titleElement?.textContent?.trim() || 'Netflix Subscription';
      
      return [{
        name: title,
        platform: 'netflix',
        type: 'subscription'
      }];
    }
    
    // Fallback for when plan selection isn't visible
    return [{
      name: 'Netflix Subscription',
      platform: 'netflix',
      type: 'subscription'
    }];
  }

  /**
   * Apply gift card to Netflix account
   */
  async applyGiftCard(giftCardData: GiftCardData): Promise<boolean> {
    try {
      console.log('🎁 Applying gift card to Netflix...');
      
      // First, try to navigate to gift card redemption if not already there
      if (!window.location.pathname.includes('/redeem')) {
        await this.navigateToGiftCardRedemption();
      }
      
      // Find gift card input section
      const giftCardSection = this.findElement(this.selectors.checkout.giftCardSection);
      if (!giftCardSection) {
        console.error('❌ Netflix gift card section not found');
        return false;
      }
      
      // Scroll to gift card section
      giftCardSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.wait(1000);
      
      // Find gift card input field
      const inputField = this.findElement(this.selectors.checkout.giftCardInput) as HTMLInputElement;
      if (!inputField) {
        console.error('❌ Netflix gift card input field not found');
        return false;
      }
      
      // Clear existing value and enter gift card code
      inputField.focus();
      inputField.value = '';
      await this.wait(500);
      
      // Type the gift card code
      await this.typeText(inputField, giftCardData.code);
      
      // Find and click redeem button
      const redeemButton = this.findElement(this.selectors.checkout.applyButton) as HTMLButtonElement;
      if (!redeemButton) {
        console.error('❌ Netflix redeem button not found');
        return false;
      }
      
      // Click redeem button
      console.log('🔄 Redeeming Netflix gift card...');
      redeemButton.click();
      
      // Wait for redemption to process
      await this.wait(3000);
      
      // Check if gift card was redeemed successfully
      const success = await this.verifyGiftCardRedemption();
      
      if (success) {
        console.log('✅ Netflix gift card redeemed successfully');
        this.showSuccessNotification('Gift card applied to Netflix account!');
        
        // Continue with signup flow if we're in it
        await this.continueSignupFlow();
      } else {
        console.error('❌ Netflix gift card redemption failed');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error applying Netflix gift card:', error);
      return false;
    }
  }

  /**
   * Navigate to Netflix gift card redemption page
   */
  private async navigateToGiftCardRedemption(): Promise<void> {
    const redeemUrl = `https://${window.location.hostname}/redeem`;
    
    // Check if there's a gift card redemption link on current page
    const redeemLink = document.querySelector('a[href*="/redeem"], a[href*="gift"]') as HTMLAnchorElement;
    
    if (redeemLink) {
      redeemLink.click();
      await this.wait(2000);
    } else {
      // Direct navigation
      window.location.href = redeemUrl;
      await this.wait(3000);
    }
  }

  /**
   * Verify that gift card was successfully redeemed
   */
  private async verifyGiftCardRedemption(): Promise<boolean> {
    // Look for success indicators
    const successSelectors = [
      '[data-uia="redeem-success"]',
      '.redeem-success-message',
      '.gift-success',
      '.success-message'
    ];
    
    for (const selector of successSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.toLowerCase().includes('success')) {
        return true;
      }
    }
    
    // Check for account balance update
    const balanceSelectors = [
      '[data-uia="account-balance"]',
      '.account-balance',
      '.gift-balance'
    ];
    
    for (const selector of balanceSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Check if we can continue with signup (indicating gift card was accepted)
    const continueButton = this.findElement(this.selectors.signup.continueButton);
    if (continueButton && !continueButton.hasAttribute('disabled')) {
      return true;
    }
    
    return false;
  }

  /**
   * Continue with Netflix signup flow after gift card redemption
   */
  private async continueSignupFlow(): Promise<void> {
    const continueButton = this.findElement(this.selectors.signup.continueButton);
    if (continueButton) {
      await this.wait(1000);
      (continueButton as HTMLButtonElement).click();
      console.log('▶️  Continuing Netflix signup flow');
    }
  }

  /**
   * Create and inject "Pay with Crypto" button for Netflix
   */
  createPayButton(): HTMLElement {
    const button = document.createElement('button');
    button.id = 'paymint-netflix-button';
    button.className = 'paymint-pay-button netflix-style';
    button.style.cssText = `
      background: linear-gradient(135deg, #E50914 0%, #B20710 100%);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin: 16px 0;
      width: 100%;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(229, 9, 20, 0.3);
      font-family: Netflix Sans, Helvetica, Arial, sans-serif;
    `;
    
    button.innerHTML = `🚀 Pay with Crypto`;
    
    // Netflix-style hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #F40612 0%, #E50914 100%)';
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 12px rgba(229, 9, 20, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #E50914 0%, #B20710 100%)';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(229, 9, 20, 0.3)';
    });
    
    return button;
  }

  /**
   * Find best location to inject the pay button
   */
  getButtonInjectionPoint(): Element | null {
    // Try to find payment selection area
    const injectionSelectors = [
      '[data-uia="payment-picker-container"]',
      '.payment-method-container',
      '.plan-selection-wrapper',
      '.redeem-gift-container'
    ];
    
    for (const selector of injectionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`📍 Netflix injection point found: ${selector}`);
        return element;
      }
    }
    
    // Fallback to main content areas
    const fallbackSelectors = [
      '.signup-body',
      '.main-content',
      '.center-content'
    ];
    
    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`📍 Netflix fallback injection point: ${selector}`);
        return element;
      }
    }
    
    return null;
  }

  // Utility methods
  private findElement(selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  private async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async typeText(input: HTMLInputElement, text: string): Promise<void> {
    for (const char of text) {
      input.value += char;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await this.wait(80 + Math.random() * 40); // Netflix expects slightly slower typing
    }
  }

  private showSuccessNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #E50914;
      color: white;
      padding: 16px;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: Netflix Sans, Helvetica, Arial, sans-serif;
      max-width: 300px;
      font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

export default new NetflixPlatform();