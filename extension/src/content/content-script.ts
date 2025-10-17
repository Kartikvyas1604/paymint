/**
 * Content Script for PAYMINT
 * Detects payment opportunities and integrates with websites
 */

// Content script state
let isInjected = false;
let paymentDetector: PaymentDetector | null = null;

class PaymentDetector {
  private observers: MutationObserver[] = [];

  constructor() {
    this.init();
  }

  private init() {
    console.log('PAYMINT payment detector initialized');
    
    // Detect existing payment forms
    this.scanForPaymentForms();
    
    // Watch for new payment forms
    this.setupMutationObserver();
    
    // Listen for URL changes (SPA navigation)
    this.setupNavigationListener();
  }

  /**
   * Scan for payment forms on the current page
   */
  private scanForPaymentForms() {
    // Common payment form selectors
    const paymentSelectors = [
      'form[action*="payment"]',
      'form[action*="checkout"]',
      'form[action*="pay"]',
      '.payment-form',
      '.checkout-form',
      '[data-testid*="payment"]',
      '[data-testid*="checkout"]',
      '.stripe-form',
      '.paypal-form'
    ];

    paymentSelectors.forEach(selector => {
      const forms = document.querySelectorAll(selector);
      forms.forEach(form => this.handlePaymentForm(form as HTMLElement));
    });

    // Look for specific e-commerce platforms
    this.detectEcommercePlatforms();
  }

  /**
   * Handle detected payment form
   */
  private handlePaymentForm(form: HTMLElement) {
    // Don't inject if already has PAYMINT button
    if (form.querySelector('.paymint-button')) {
      return;
    }

    console.log('Payment form detected:', form);

    // Try to extract payment amount
    const amount = this.extractAmount(form);
    
    if (amount && amount > 0) {
      this.addPaymintButton(form, amount);
    }
  }

  /**
   * Extract payment amount from form
   */
  private extractAmount(form: HTMLElement): number | null {
    // Common amount selectors
    const amountSelectors = [
      '.amount',
      '.price',
      '.total',
      '.cost',
      '[data-amount]',
      '[data-price]',
      '[data-total]',
      'input[name*="amount"]',
      'input[name*="price"]',
      'input[name*="total"]'
    ];

    for (const selector of amountSelectors) {
      const element = form.querySelector(selector) as HTMLElement;
      if (element) {
        let amountText = '';
        
        if (element.tagName === 'INPUT') {
          amountText = (element as HTMLInputElement).value;
        } else {
          amountText = element.textContent || element.getAttribute('data-amount') || '';
        }

        // Extract numeric value
        const match = amountText.match(/[\d,]+\.?\d*/);
        if (match) {
          const cleanAmount = match[0].replace(/,/g, '');
          const amount = parseFloat(cleanAmount);
          
          if (!isNaN(amount) && amount > 0) {
            console.log('Extracted amount:', amount);
            return amount;
          }
        }
      }
    }

    return null;
  }

  /**
   * Add PAYMINT button to payment form
   */
  private addPaymintButton(form: HTMLElement, amount: number) {
    const button = document.createElement('button');
    button.className = 'paymint-button';
    button.type = 'button';
    button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
        margin: 8px 0;
      ">
        <span>💳</span>
        Pay with PAYMINT ($${amount.toFixed(2)})
      </div>
    `;

    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-1px)';
      button.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
    });

    // Handle click
    button.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      await this.initiatePaymintPayment(amount);
    });

    // Find best insertion point
    let insertionPoint = form.querySelector('.payment-submit, [type="submit"], .checkout-button');
    
    if (insertionPoint) {
      insertionPoint.parentNode?.insertBefore(button, insertionPoint);
    } else {
      form.appendChild(button);
    }

    console.log('PAYMINT button added to form');
  }

  /**
   * Initiate PAYMINT payment flow
   */
  private async initiatePaymintPayment(amount: number) {
    try {
      console.log('Initiating PAYMINT payment for amount:', amount);

      // Send message to background script to open popup
      const response = await chrome.runtime.sendMessage({
        type: 'INITIATE_PAYMENT',
        amount,
        currency: 'USD',
        url: window.location.href,
        timestamp: new Date().toISOString()
      });

      if (response.success) {
        // Show success indicator
        this.showPaymentIndicator('Payment initiated! Check the PAYMINT extension popup.');
      } else {
        throw new Error(response.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('PAYMINT payment error:', error);
      this.showPaymentIndicator('Payment failed. Please try again.', 'error');
    }
  }

  /**
   * Show payment status indicator
   */
  private showPaymentIndicator(message: string, type: 'success' | 'error' = 'success') {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10B981' : '#EF4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    indicator.textContent = message;
    document.body.appendChild(indicator);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      indicator.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        document.body.removeChild(indicator);
      }, 300);
    }, 3000);
  }

  /**
   * Detect specific e-commerce platforms
   */
  private detectEcommercePlatforms() {
    // Shopify
    if ((window as any).Shopify || document.querySelector('[data-shopify]')) {
      this.handleShopify();
    }

    // WooCommerce
    if (document.querySelector('.woocommerce') || document.body.classList.contains('woocommerce-checkout')) {
      this.handleWooCommerce();
    }

    // Stripe
    if (document.querySelector('.stripe-form, [data-stripe]')) {
      this.handleStripe();
    }
  }

  private handleShopify() {
    console.log('Shopify detected');
    // Add specific Shopify integration logic
  }

  private handleWooCommerce() {
    console.log('WooCommerce detected');
    // Add specific WooCommerce integration logic
  }

  private handleStripe() {
    console.log('Stripe detected');
    // Add specific Stripe integration logic
  }

  /**
   * Setup mutation observer for dynamic content
   */
  private setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
              // Check if the new element is or contains payment forms
              if (element.matches('form') || element.querySelector('form')) {
                setTimeout(() => this.scanForPaymentForms(), 100);
              }
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    this.observers.push(observer);
  }

  /**
   * Setup navigation listener for SPAs
   */
  private setupNavigationListener() {
    let currentUrl = window.location.href;
    
    const checkForUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('URL changed, re-scanning for payment forms');
        setTimeout(() => this.scanForPaymentForms(), 500);
      }
    };

    // Listen for history changes
    window.addEventListener('popstate', checkForUrlChange);
    
    // Override pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(checkForUrlChange, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(checkForUrlChange, 100);
    };
  }

  /**
   * Cleanup observers
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  if (isInjected) return;
  
  isInjected = true;
  paymentDetector = new PaymentDetector();
  
  console.log('PAYMINT content script loaded');
}

// Cleanup on unload
window.addEventListener('beforeunload', () => {
  if (paymentDetector) {
    paymentDetector.destroy();
  }
});

// CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);