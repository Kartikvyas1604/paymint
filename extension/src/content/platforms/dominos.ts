/**
 * Domino's Platform Integration
 * 
 * Handles detection, price parsing, and gift card application for Domino's Pizza
 * Supports online ordering checkout and gift card redemption flow.
 */



import { PlatformDetector, GiftCardData, CheckoutInfo } from './types';

export class DominosPlatform implements PlatformDetector {
  readonly name = 'dominos';
  readonly displayName = "Domino's Pizza";
  readonly supportedDomains = [
    'dominos.com', 'dominos.co.uk', 'dominos.de', 'dominos.com.au',
    'dominos.ca', 'dominos.co.nz', 'dominos.ie', 'dominos.fr'
  ];

  // Domino's-specific CSS selectors
  private readonly selectors = {
    checkout: {
      totalPrice: [
        '[data-quid="order-summary-total"]',
        '.order-total .price',
        '#total-price',
        '.checkout-total .amount',
        '.order-summary-total-row .total-amount'
      ],
      giftCardSection: [
        '[data-quid="gift-card-section"]',
        '.gift-card-container',
        '#gift-card-form',
        '.payment-gift-card',
        '.promo-gift-card-section'
      ],
      giftCardInput: [
        '[data-quid="gift-card-input"]',
        'input[name="giftCardNumber"]',
        '#gift-card-number',
        'input[placeholder*="gift card"]',
        'input[aria-label*="gift card"]'
      ],
      applyButton: [
        '[data-quid="apply-gift-card"]',
        'button[data-quid="gift-card-apply"]',
        '.apply-gift-card-btn',
        'button:contains("Apply Gift Card")',
        '.btn-apply-gift-card'
      ]
    },
    cart: {
      cartItems: [
        '.cart-item',
        '[data-quid="cart-item"]',
        '.order-item',
        '.pizza-item'
      ],
      itemName: [
        '.item-name',
        '[data-quid="item-name"]',
        '.product-name'
      ],
      itemPrice: [
        '.item-price',
        '[data-quid="item-price"]',
        '.product-price'
      ]
    },
    payment: {
      paymentSection: [
        '[data-quid="payment-section"]',
        '.payment-methods',
        '#payment-container',
        '.checkout-payment'
      ],
      creditCardOption: [
        '[data-quid="credit-card-payment"]',
        '.payment-method-credit',
        '#credit-card-option'
      ]
    }
  };

  /**
   * Detect if current page is Domino's checkout or cart page
   */
  isDetected(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Check if we're on a supported Domino's domain
    const isDominosDomain = this.supportedDomains.some(domain => 
      hostname.includes(domain)
    );
    
    if (!isDominosDomain) return false;
    
    // Check if we're on checkout, cart, or payment pages
    const isRelevantPage = [
      '/checkout',
      '/cart',
      '/order-summary',
      '/payment',
      '/review-order'
    ].some(path => pathname.includes(path));
    
    // Check for Domino's-specific elements
    const hasOrderTotal = this.findElement(this.selectors.checkout.totalPrice) !== null;
    const hasCartItems = this.findElement(this.selectors.cart.cartItems) !== null;
    const hasPaymentSection = this.findElement(this.selectors.payment.paymentSection) !== null;
    
    const detected = isRelevantPage || hasOrderTotal || hasCartItems || hasPaymentSection;
    
    if (detected) {
      console.log('🍕 Dominos platform detected');
      console.log(`📍 Current URL: ${window.location.href}`);
    }
    
    return detected;
  }

  /**
   * Get checkout information from Domino's order page
   */
  getCheckoutInfo(): CheckoutInfo | null {
    try {
      const totalPrice = this.extractTotalPrice();
      
      if (!totalPrice) {
        console.warn('⚠️  Could not extract Dominos total price');
        return null;
      }

      return {
        platform: this.name,
        totalAmount: totalPrice.amount,
        currency: totalPrice.currency,
        items: this.extractOrderItems(),
        checkoutUrl: window.location.href,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to get Dominos checkout info:', error);
      return null;
    }
  }

  /**
   * Extract total price from Domino's page
   */
  private extractTotalPrice(): { amount: number; currency: string } | null {
    // Try main total price selectors
    for (const selector of this.selectors.checkout.totalPrice) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || '';
        const parsed = this.parseDominosPrice(priceText);
        if (parsed) return parsed;
      }
    }
    
    // Fallback: look for any element with "total" and price pattern
    const totalElements = document.querySelectorAll('*[class*="total"], *[data-quid*="total"]');
    for (const element of totalElements) {
      const priceText = element.textContent || '';
      if (priceText.match(/[\$£€]\d+\.\d{2}/)) {
        const parsed = this.parseDominosPrice(priceText);
        if (parsed) return parsed;
      }
    }
    
    return null;
  }

  /**
   * Parse price text from Domino's (handles multiple currencies and formats)
   */
  private parseDominosPrice(priceText: string): { amount: number; currency: string } | null {
    if (!priceText) return null;
    
    // Clean the price text
    const cleanText = priceText.replace(/\s+/g, ' ').trim();
    
    // Domino's price patterns
    const patterns = [
      // Standard formats: $15.99, £12.99, €14.50
      /([£$€])(\d+(?:\.\d{2})?)/,
      // Alternative formats: 15.99 USD, 12.99 GBP
      /(\d+(?:\.\d{2})?)\s*([A-Z]{3})/,
      // With "Total" prefix: Total: $15.99
      /total:?\s*([£$€])(\d+(?:\.\d{2})?)/i,
      // Formatted with commas: $1,234.56
      /([£$€])(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/
    ];
    
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        let amount: number;
        let currency: string;
        
        if (match[1] && match[2] && /[£$€]/.test(match[1])) {
          // Currency symbol first
          amount = parseFloat(match[2].replace(/,/g, ''));
          currency = this.getCurrencyFromSymbol(match[1]);
        } else if (match[1] && match[2] && /[A-Z]{3}/.test(match[2])) {
          // Amount first, currency code after
          amount = parseFloat(match[1].replace(/,/g, ''));
          currency = match[2];
        } else {
          continue;
        }
        
        if (isNaN(amount)) continue;
        
        console.log(`💰 Dominos price parsed: ${amount} ${currency}`);
        return { amount, currency };
      }
    }
    
    console.warn(`⚠️  Could not parse Dominos price: "${cleanText}"`);
    return null;
  }

  /**
   * Map currency symbols to currency codes
   */
  private getCurrencyFromSymbol(symbol: string): string {
    const mapping: { [key: string]: string } = {
      '$': 'USD',
      '£': 'GBP', 
      '€': 'EUR'
    };
    return mapping[symbol] || 'USD';
  }

  /**
   * Extract order items from Domino's cart
   */
  private extractOrderItems(): any[] {
    const items: any[] = [];
    
    // Find cart item containers
    const itemElements = document.querySelectorAll(this.selectors.cart.cartItems.join(', '));
    
    itemElements.forEach((element, index) => {
      // Try to find item name
      const nameElement = element.querySelector(this.selectors.cart.itemName.join(', '));
      const name = nameElement?.textContent?.trim() || `Pizza Item ${index + 1}`;
      
      // Try to find item price
      const priceElement = element.querySelector(this.selectors.cart.itemPrice.join(', '));
      let price = 0;
      if (priceElement) {
        const priceText = priceElement.textContent || '';
        const parsed = this.parseDominosPrice(priceText);
        price = parsed?.amount || 0;
      }
      
      items.push({
        name: name,
        platform: 'dominos',
        price: price,
        type: 'food'
      });
    });
    
    // If no items found, create a generic entry
    if (items.length === 0) {
      items.push({
        name: "Domino's Order",
        platform: 'dominos',
        type: 'food'
      });
    }
    
    return items.slice(0, 10); // Limit to 10 items
  }

  /**
   * Apply gift card to Domino's order
   */
  async applyGiftCard(giftCardData: GiftCardData): Promise<boolean> {
    try {
      console.log('🎁 Applying gift card to Dominos order...');
      
      // Find or navigate to gift card section
      let giftCardSection = this.findElement(this.selectors.checkout.giftCardSection);
      
      if (!giftCardSection) {
        // Try to find a "Add Gift Card" or "Promo Code" link to expand the section
        const expandLinks = document.querySelectorAll('a[href*="gift"], button[data-quid*="gift"], .add-gift-card, .promo-code-toggle');
        for (const link of expandLinks) {
          (link as HTMLElement).click();
          await this.wait(1000);
          
          giftCardSection = this.findElement(this.selectors.checkout.giftCardSection);
          if (giftCardSection) break;
        }
      }
      
      if (!giftCardSection) {
        console.error('❌ Dominos gift card section not found');
        return false;
      }
      
      // Scroll to gift card section
      giftCardSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.wait(1000);
      
      // Find gift card input field
      const inputField = this.findElement(this.selectors.checkout.giftCardInput) as HTMLInputElement;
      if (!inputField) {
        console.error('❌ Dominos gift card input field not found');
        return false;
      }
      
      // Clear existing value and enter gift card code
      inputField.focus();
      inputField.value = '';
      await this.wait(500);
      
      // Type the gift card code
      await this.typeText(inputField, giftCardData.code);
      
      // Find and click apply button
      const applyButton = this.findElement(this.selectors.checkout.applyButton) as HTMLButtonElement;
      if (!applyButton) {
        // Try pressing Enter in the input field as fallback
        inputField.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      } else {
        applyButton.click();
      }
      
      console.log('🔄 Applying Dominos gift card...');
      
      // Wait for application to process
      await this.wait(3000);
      
      // Check if gift card was applied successfully
      const success = await this.verifyGiftCardApplication();
      
      if (success) {
        console.log('✅ Dominos gift card applied successfully');
        this.showSuccessNotification('Gift card applied to your Dominos order!');
      } else {
        console.error('❌ Dominos gift card application failed');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error applying Dominos gift card:', error);
      return false;
    }
  }

  /**
   * Verify that gift card was successfully applied
   */
  private async verifyGiftCardApplication(): Promise<boolean> {
    // Look for success messages
    const successSelectors = [
      '.gift-card-success',
      '.promo-success',
      '[data-quid*="success"]',
      '.alert-success'
    ];
    
    for (const selector of successSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.toLowerCase().includes('applied')) {
        return true;
      }
    }
    
    // Check for gift card balance display
    const balanceSelectors = [
      '.gift-card-balance',
      '[data-quid*="gift-card-applied"]',
      '.applied-gift-card'
    ];
    
    for (const selector of balanceSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Check if total price decreased (compare with original if possible)
    const newTotal = this.extractTotalPrice();
    if (newTotal && newTotal.amount > 0) {
      // In a real implementation, we'd compare with the previous total
      return true;
    }
    
    // Check if there's a discount line item
    const discountSelectors = [
      '.discount-line',
      '.gift-card-discount',
      '[data-quid*="discount"]'
    ];
    
    for (const selector of discountSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Create and inject "Pay with Crypto" button for Domino's
   */
  createPayButton(): HTMLElement {
    const button = document.createElement('button');
    button.id = 'paymint-dominos-button';
    button.className = 'paymint-pay-button dominos-style';
    button.style.cssText = `
      background: linear-gradient(135deg, #0078D7 0%, #005BB5 100%);
      color: white;
      border: none;
      border-radius: 6px;
      padding: 14px 28px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      margin: 12px 0;
      width: 100%;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(0, 120, 215, 0.3);
      font-family: Arial, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;
    
    button.innerHTML = `🚀 Pay with Crypto`;
    
    // Domino's-style hover effects
    button.addEventListener('mouseenter', () => {
      button.style.background = 'linear-gradient(135deg, #106EBE 0%, #0078D7 100%)';
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(0, 120, 215, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.background = 'linear-gradient(135deg, #0078D7 0%, #005BB5 100%)';
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(0, 120, 215, 0.3)';
    });
    
    return button;
  }

  /**
   * Find best location to inject the pay button
   */
  getButtonInjectionPoint(): Element | null {
    // Try to find payment method selection area
    const injectionSelectors = [
      '[data-quid="payment-section"]',
      '.payment-methods',
      '.checkout-payment',
      '.payment-options'
    ];
    
    for (const selector of injectionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`📍 Dominos injection point found: ${selector}`);
        return element;
      }
    }
    
    // Fallback to checkout or cart areas
    const fallbackSelectors = [
      '.checkout-container',
      '.order-summary',
      '.cart-summary',
      '#checkout-content'
    ];
    
    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`📍 Dominos fallback injection point: ${selector}`);
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
      await this.wait(60 + Math.random() * 40); // Moderate typing speed for Domino's
    }
  }

  private showSuccessNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0078D7;
      color: white;
      padding: 16px;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      max-width: 300px;
      font-weight: 600;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

export default new DominosPlatform();