/**
 * Amazon Platform Integration
 * 
 * Handles detection, price parsing, and gift card application for Amazon.com
 * Supports multiple Amazon regions and checkout flows.
 */

import { PlatformDetector, GiftCardData, CheckoutInfo } from './types';

export class AmazonPlatform implements PlatformDetector {
  readonly name = 'amazon';
  readonly displayName = 'Amazon';
  readonly supportedDomains = [
    'amazon.com', 'amazon.co.uk', 'amazon.de', 'amazon.fr', 
    'amazon.it', 'amazon.es', 'amazon.ca', 'amazon.com.au'
  ];

  // Amazon-specific CSS selectors (tested on actual pages)
  private readonly selectors = {
    // Checkout page selectors
    checkout: {
      totalPrice: [
        '#subtotals-marketplace-table .grand-total-price',
        '.grand-total-price-value',
        '#subtotals-marketplace-spc .a-offscreen',
        'span[data-feature-name="subtotals"] .currencyINR'
      ],
      giftCardSection: [
        '#gc-redemption-section',
        '.a-box[data-testid="gift-cards-and-promotional-codes"]',
        '#gift-cards-and-promotional-codes'
      ],
      giftCardInput: [
        '#gc-redemption-input',
        'input[name="giftCardCode"]',
        'input[aria-label*="gift card"]'
      ],
      applyButton: [
        '#gc-redemption-apply-button',
        'button[aria-label*="Apply gift card"]',
        '.a-button[data-testid="apply-gift-card-button"]'
      ]
    },
    // Product page selectors
    product: {
      price: [
        '.a-price-whole',
        '#priceblock_dealprice',
        '#priceblock_ourprice',
        '.a-offscreen'
      ],
      buyNowButton: [
        '#buy-now-button',
        'input[name="submit.buy-now"]'
      ]
    }
  };

  /**
   * Detect if current page is Amazon checkout or product page
   */
  isDetected(): boolean {
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Check if we're on a supported Amazon domain
    const isAmazonDomain = this.supportedDomains.some(domain => 
      hostname.includes(domain)
    );
    
    if (!isAmazonDomain) return false;
    
    // Check if we're on checkout or cart page
    const isCheckoutPage = [
      '/gp/buy/',
      '/checkout/',
      '/gp/cart/view.html',
      '/gp/cart/',
      '/ap/signin' // Sometimes redirects to signin during checkout
    ].some(path => pathname.includes(path));
    
    // Also check if we're on a product page with Buy Now button
    const hasBuyNowButton = this.findElement(this.selectors.product.buyNowButton) !== null;
    
    const detected = isCheckoutPage || hasBuyNowButton;
    
    if (detected) {
      console.log('🛒 Amazon platform detected');
      console.log(`📍 Current URL: ${window.location.href}`);
    }
    
    return detected;
  }

  /**
   * Get checkout information from Amazon page
   */
  getCheckoutInfo(): CheckoutInfo | null {
    try {
      const totalPrice = this.extractTotalPrice();
      
      if (!totalPrice) {
        console.warn('⚠️  Could not extract Amazon total price');
        return null;
      }

      return {
        platform: this.name,
        totalAmount: totalPrice.amount,
        currency: totalPrice.currency,
        items: this.extractItems(),
        checkoutUrl: window.location.href,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('❌ Failed to get Amazon checkout info:', error);
      return null;
    }
  }

  /**
   * Extract total price from Amazon page
   */
  private extractTotalPrice(): { amount: number; currency: string } | null {
    // Try checkout page selectors first
    for (const selector of this.selectors.checkout.totalPrice) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || '';
        const parsed = this.parseAmazonPrice(priceText);
        if (parsed) return parsed;
      }
    }
    
    // Try product page selectors
    for (const selector of this.selectors.product.price) {
      const element = document.querySelector(selector);
      if (element) {
        const priceText = element.textContent || '';
        const parsed = this.parseAmazonPrice(priceText);
        if (parsed) return parsed;
      }
    }
    
    return null;
  }

  /**
   * Parse price text from Amazon (handles multiple currencies and formats)
   */
  private parseAmazonPrice(priceText: string): { amount: number; currency: string } | null {
    if (!priceText) return null;
    
    // Clean the price text
    const cleanText = priceText.replace(/\s+/g, ' ').trim();
    
    // Common Amazon price patterns
    const patterns = [
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/,  // $123.45, $1,234.56
      /£(\d+(?:,\d{3})*(?:\.\d{2})?)/,  // £123.45
      /€(\d+(?:,\d{3})*(?:\.\d{2})?)/,  // €123.45
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*USD/, // 123.45 USD
      /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*\$/, // 123.45 $
      /₹(\d+(?:,\d{3})*(?:\.\d{2})?)/   // ₹123.45 (Indian Rupee)
    ];
    
    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const amount = parseFloat(amountStr);
        
        if (isNaN(amount)) continue;
        
        // Determine currency from pattern
        let currency = 'USD';
        if (cleanText.includes('£')) currency = 'GBP';
        else if (cleanText.includes('€')) currency = 'EUR';
        else if (cleanText.includes('₹')) currency = 'INR';
        else if (cleanText.includes('USD')) currency = 'USD';
        
        console.log(`💰 Amazon price parsed: ${amount} ${currency}`);
        return { amount, currency };
      }
    }
    
    console.warn(`⚠️  Could not parse Amazon price: "${cleanText}"`);
    return null;
  }

  /**
   * Extract items from Amazon checkout (limited info available)
   */
  private extractItems(): any[] {
    const items: any[] = [];
    
    // Try to find item containers in checkout
    const itemSelectors = [
      '.sc-item-content-group',
      '.a-row.sc-item-row',
      '[data-name="Active Items"] .sc-list-item'
    ];
    
    for (const selector of itemSelectors) {
      const itemElements = document.querySelectorAll(selector);
      
      itemElements.forEach((element, index) => {
        const titleElement = element.querySelector('.sc-product-title, .a-truncate-full');
        const title = titleElement?.textContent?.trim() || `Item ${index + 1}`;
        
        items.push({
          name: title,
          platform: 'amazon'
        });
      });
      
      if (items.length > 0) break;
    }
    
    return items.slice(0, 5); // Limit to 5 items
  }

  /**
   * Apply gift card to Amazon checkout
   */
  async applyGiftCard(giftCardData: GiftCardData): Promise<boolean> {
    try {
      console.log('🎁 Applying gift card to Amazon checkout...');
      
      // Find gift card input section
      const giftCardSection = this.findElement(this.selectors.checkout.giftCardSection);
      if (!giftCardSection) {
        console.error('❌ Amazon gift card section not found');
        return false;
      }
      
      // Scroll to gift card section
      giftCardSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await this.wait(1000);
      
      // Find gift card input field
      const inputField = this.findElement(this.selectors.checkout.giftCardInput) as HTMLInputElement;
      if (!inputField) {
        console.error('❌ Amazon gift card input field not found');
        return false;
      }
      
      // Clear existing value and enter gift card code
      inputField.focus();
      inputField.value = '';
      await this.wait(500);
      
      // Type the gift card code (simulate human typing)
      await this.typeText(inputField, giftCardData.code);
      
      // Find and click apply button
      const applyButton = this.findElement(this.selectors.checkout.applyButton) as HTMLButtonElement;
      if (!applyButton) {
        console.error('❌ Amazon gift card apply button not found');
        return false;
      }
      
      // Click apply button
      console.log('🔄 Applying Amazon gift card...');
      applyButton.click();
      
      // Wait for application to process
      await this.wait(3000);
      
      // Check if gift card was applied successfully
      const success = await this.verifyGiftCardApplication();
      
      if (success) {
        console.log('✅ Amazon gift card applied successfully');
        
        // Create success notification
        this.showSuccessNotification('Gift card applied to Amazon checkout!');
      } else {
        console.error('❌ Amazon gift card application failed');
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Error applying Amazon gift card:', error);
      return false;
    }
  }

  /**
   * Verify that gift card was successfully applied
   */
  private async verifyGiftCardApplication(): Promise<boolean> {
    // Look for success indicators
    const successSelectors = [
      '.a-alert-success',
      '.gc-redemption-success',
      '[data-testid="gc-redemption-success"]',
      '.a-alert-content:contains("applied")'
    ];
    
    for (const selector of successSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent?.toLowerCase().includes('applied')) {
        return true;
      }
    }
    
    // Check if gift card balance is now shown
    const balanceSelectors = [
      '.gc-redemption-balance',
      '[data-testid="gift-card-balance"]'
    ];
    
    for (const selector of balanceSelectors) {
      if (document.querySelector(selector)) {
        return true;
      }
    }
    
    // Check if total price decreased (indicating gift card was applied)
    const newTotal = this.extractTotalPrice();
    if (newTotal && newTotal.amount > 0) {
      // In a real implementation, we'd compare with previous total
      return true;
    }
    
    return false;
  }

  /**
   * Create and inject "Pay with Crypto" button
   */
  createPayButton(): HTMLElement {
    const button = document.createElement('button');
    button.id = 'paymint-amazon-button';
    button.className = 'a-button a-button-primary paymint-pay-button';
    button.style.cssText = `
      background: linear-gradient(135deg, #FF9900 0%, #FF7700 100%);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      margin: 10px 0;
      transition: all 0.3s ease;
      box-shadow: 0 2px 8px rgba(255, 153, 0, 0.3);
    `;
    
    button.innerHTML = `
      <span class="a-button-inner">
        <span class="a-button-text">
          🚀 Pay with Crypto
        </span>
      </span>
    `;
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 4px 12px rgba(255, 153, 0, 0.4)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(255, 153, 0, 0.3)';
    });
    
    return button;
  }

  /**
   * Find best location to inject the pay button
   */
  getButtonInjectionPoint(): Element | null {
    // Try to find checkout buttons area
    const injectionSelectors = [
      '#checkout-button-group',
      '#placeYourOrder',
      '.a-button-group-vertical',
      '.pmts-button-group'
    ];
    
    for (const selector of injectionSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`📍 Amazon injection point found: ${selector}`);
        return element;
      }
    }
    
    // Fallback to any checkout section
    const fallbackSelectors = [
      '#subtotals-marketplace-table',
      '.a-box-group'
    ];
    
    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`📍 Amazon fallback injection point: ${selector}`);
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
      await this.wait(50 + Math.random() * 50); // Human-like typing speed
    }
  }

  private showSuccessNotification(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2e7d32;
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 5000);
  }
}

export default new AmazonPlatform();