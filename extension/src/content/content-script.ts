/**
 * PAYMINT Content Script
 * 
 * Main content script injected into e-commerce pages to:
 * - Detect supported platforms (Amazon, Netflix, Domino's)
 * - Extract checkout information 
 * - Inject "Pay with Crypto" buttons
 * - Handle gift card application
 * - Coordinate with background script for payment flow
 */

import detectCurrentPlatform, { 
  PLATFORM_LIST, 
  isSupportedDomain, 
  PlatformDetector,
  CheckoutInfo,
  GiftCardData 
} from './platforms';

class PaymintContentScript {
  private currentPlatform: PlatformDetector | null = null;
  private payButton: HTMLElement | null = null;
  private isInitialized = false;
  private observer: MutationObserver | null = null;

  constructor() {
    console.log('🚀 PAYMINT content script initializing...');
    this.initialize();
  }

  /**
   * Initialize the content script
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Check if we're on a supported domain
      if (!isSupportedDomain(window.location.hostname)) {
        console.log('ℹ️  Domain not supported, PAYMINT will not activate');
        return;
      }

      console.log('🌐 Supported domain detected, checking platform...');

      // Wait for page to load and detect platform
      await this.waitForPageLoad();
      await this.detectAndSetupPlatform();

      // Set up DOM mutation observer for dynamic content
      this.setupMutationObserver();

      // Listen for messages from background script
      this.setupMessageListener();

      this.isInitialized = true;
      console.log('✅ PAYMINT content script initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize PAYMINT content script:', error);
    }
  }

  /**
   * Wait for page to be fully loaded
   */
  private async waitForPageLoad(): Promise<void> {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', () => resolve());
        // Fallback timeout
        setTimeout(() => resolve(), 3000);
      }
    });
  }

  /**
   * Detect platform and set up integration
   */
  private async detectAndSetupPlatform(): Promise<void> {
    // Try to detect platform
    this.currentPlatform = detectCurrentPlatform();

    if (!this.currentPlatform) {
      console.log('ℹ️  No platform detected, will retry on DOM changes');
      return;
    }

    console.log(`🎯 Platform detected: ${this.currentPlatform.displayName}`);

    // Set up platform-specific integration
    await this.setupPlatformIntegration();
  }

  /**
   * Set up platform-specific integration
   */
  private async setupPlatformIntegration(): Promise<void> {
    if (!this.currentPlatform) return;

    try {
      // Get checkout information
      const checkoutInfo = this.currentPlatform.getCheckoutInfo();
      
      if (checkoutInfo) {
        console.log('💰 Checkout info extracted:', checkoutInfo);
        
        // Send checkout info to background script
        chrome.runtime.sendMessage({
          type: 'CHECKOUT_INFO_DETECTED',
          platform: this.currentPlatform.name,
          checkoutInfo: checkoutInfo
        });
      }

      // Inject Pay with Crypto button
      await this.injectPayButton();

    } catch (error) {
      console.error('❌ Failed to setup platform integration:', error);
    }
  }

  /**
   * Inject the "Pay with Crypto" button
   */
  private async injectPayButton(): Promise<void> {
    if (!this.currentPlatform || this.payButton) return;

    try {
      // Find injection point
      const injectionPoint = this.currentPlatform.getButtonInjectionPoint();
      if (!injectionPoint) {
        console.warn('⚠️  Could not find button injection point, will retry');
        return;
      }

      // Create platform-specific pay button
      this.payButton = this.currentPlatform.createPayButton();

      // Add click handler
      this.payButton.addEventListener('click', () => this.handlePayButtonClick());

      // Inject button
      injectionPoint.appendChild(this.payButton);

      console.log(`✅ Pay with Crypto button injected for ${this.currentPlatform.displayName}`);

      // Notify background script
      chrome.runtime.sendMessage({
        type: 'PAY_BUTTON_INJECTED',
        platform: this.currentPlatform.name,
        url: window.location.href
      });

    } catch (error) {
      console.error('❌ Failed to inject pay button:', error);
    }
  }

  /**
   * Handle pay button click
   */
  private async handlePayButtonClick(): Promise<void> {
    if (!this.currentPlatform) return;

    console.log('🎯 Pay with Crypto button clicked');

    try {
      // Get latest checkout info
      const checkoutInfo = this.currentPlatform.getCheckoutInfo();
      
      if (!checkoutInfo) {
        console.error('❌ Could not get checkout information');
        this.showNotification('error', 'Unable to process payment. Please try again.');
        return;
      }

      // Show loading state
      this.setPayButtonLoading(true);

      // Send payment initiation message to background script
      chrome.runtime.sendMessage({
        type: 'INITIATE_CRYPTO_PAYMENT',
        platform: this.currentPlatform.name,
        checkoutInfo: checkoutInfo,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ Error handling pay button click:', error);
      this.setPayButtonLoading(false);
      this.showNotification('error', 'Payment initiation failed. Please try again.');
    }
  }

  /**
   * Apply gift card to current platform
   */
  private async applyGiftCard(giftCardData: GiftCardData): Promise<void> {
    if (!this.currentPlatform) {
      console.error('❌ No platform available for gift card application');
      return;
    }

    console.log(`🎁 Applying gift card to ${this.currentPlatform.displayName}...`);

    try {
      const success = await this.currentPlatform.applyGiftCard(giftCardData);
      
      if (success) {
        console.log('✅ Gift card applied successfully');
        this.showNotification('success', `Gift card applied to ${this.currentPlatform.displayName}!`);
        
        // Notify background script of success
        chrome.runtime.sendMessage({
          type: 'GIFT_CARD_APPLIED_SUCCESS',
          platform: this.currentPlatform.name,
          giftCard: giftCardData
        });
      } else {
        console.error('❌ Gift card application failed');
        this.showNotification('error', 'Gift card application failed. Please try manually.');
        
        // Notify background script of failure
        chrome.runtime.sendMessage({
          type: 'GIFT_CARD_APPLIED_FAILED',
          platform: this.currentPlatform.name,
          giftCard: giftCardData
        });
      }

    } catch (error) {
      console.error('❌ Error applying gift card:', error);
      this.showNotification('error', 'Error applying gift card. Please try manually.');
    }
  }

  /**
   * Set pay button loading state
   */
  private setPayButtonLoading(loading: boolean): void {
    if (!this.payButton) return;

    if (loading) {
      this.payButton.style.opacity = '0.7';
      this.payButton.style.cursor = 'not-allowed';
      this.payButton.textContent = '⏳ Processing...';
    } else {
      this.payButton.style.opacity = '1';
      this.payButton.style.cursor = 'pointer';
      this.payButton.textContent = '🚀 Pay with Crypto';
    }
  }

  /**
   * Set up mutation observer for dynamic content
   */
  private setupMutationObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      let shouldCheck = false;

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if significant DOM changes occurred
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              shouldCheck = true;
              break;
            }
          }
        }
      });

      if (shouldCheck) {
        // Debounce platform detection
        clearTimeout((this as any).detectionTimeout);
        (this as any).detectionTimeout = setTimeout(() => {
          this.retryPlatformDetection();
        }, 1000);
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  /**
   * Retry platform detection (for dynamic pages)
   */
  private async retryPlatformDetection(): Promise<void> {
    if (this.currentPlatform && this.payButton) {
      // Already detected and set up
      return;
    }

    console.log('🔄 Retrying platform detection...');
    await this.detectAndSetupPlatform();
  }

  /**
   * Set up message listener for background script communication
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('📨 Content script received message:', message);

      switch (message.type) {
        case 'APPLY_GIFT_CARD':
          this.applyGiftCard(message.giftCardData);
          sendResponse({ success: true });
          break;

        case 'GET_CHECKOUT_INFO':
          const checkoutInfo = this.currentPlatform?.getCheckoutInfo() || null;
          sendResponse({ checkoutInfo });
          break;

        case 'PAYMENT_COMPLETED':
          this.setPayButtonLoading(false);
          this.showNotification('success', 'Payment completed successfully!');
          sendResponse({ success: true });
          break;

        case 'PAYMENT_FAILED':
          this.setPayButtonLoading(false);
          this.showNotification('error', message.error || 'Payment failed. Please try again.');
          sendResponse({ success: true });
          break;

        default:
          console.warn('⚠️  Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    });
  }

  /**
   * Show notification to user
   */
  private showNotification(type: 'success' | 'error' | 'info', message: string): void {
    const notification = document.createElement('div');
    
    const colors = {
      success: '#2e7d32',
      error: '#d32f2f', 
      info: '#1976d2'
    };

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 10000;
      font-family: Arial, sans-serif;
      max-width: 300px;
      font-weight: 500;
      animation: slideIn 0.3s ease-out;
    `;

    // Add animation keyframes
    if (!document.getElementById('paymint-styles')) {
      const styles = document.createElement('style');
      styles.id = 'paymint-styles';
      styles.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(styles);
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto-remove notification
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.payButton) {
      this.payButton.remove();
      this.payButton = null;
    }

    console.log('🧹 PAYMINT content script cleaned up');
  }
}

// Global variables and initialization
let contentScript: PaymintContentScript | null = null;
let isInjected = false;

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    contentScript = new PaymintContentScript();
    isInjected = true;
  });
} else {
  contentScript = new PaymintContentScript();
  isInjected = true;
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  contentScript?.cleanup();
});