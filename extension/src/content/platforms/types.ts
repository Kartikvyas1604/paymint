/**
 * Platform Integration Types
 * 
 * Type definitions for platform detection, checkout info, and gift card application
 */

export interface PlatformDetector {
  readonly name: string;
  readonly displayName: string;
  readonly supportedDomains: string[];
  
  // Core platform methods
  isDetected(): boolean;
  getCheckoutInfo(): CheckoutInfo | null;
  applyGiftCard(giftCardData: GiftCardData): Promise<boolean>;
  createPayButton(): HTMLElement;
  getButtonInjectionPoint(): Element | null;
}

export interface CheckoutInfo {
  platform: string;
  totalAmount: number;
  currency: string;
  items: CheckoutItem[];
  checkoutUrl: string;
  timestamp: number;
}

export interface CheckoutItem {
  name: string;
  platform: string;
  price?: number;
  quantity?: number;
  image?: string;
}

export interface GiftCardData {
  code: string;
  amount: number;
  currency: string;
  platform: string;
  expiresAt?: string;
  balance?: number;
}

export interface PlatformConfig {
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  selectors: PlatformSelectors;
}

export interface PlatformSelectors {
  checkout: {
    totalPrice: string[];
    giftCardSection: string[];
    giftCardInput: string[];
    applyButton: string[];
  };
  product?: {
    price: string[];
    buyNowButton: string[];
  };
}

export interface PayButtonStyle {
  background: string;
  color: string;
  borderRadius: string;
  padding: string;
  fontSize: string;
  fontWeight: string;
  margin: string;
  boxShadow: string;
}

export interface PlatformDetectionResult {
  detected: boolean;
  platform: string;
  confidence: number;
  checkoutInfo?: CheckoutInfo;
  buttonInjectionPoint?: Element;
}

export interface GiftCardApplicationResult {
  success: boolean;
  platform: string;
  appliedAmount?: number;
  remainingBalance?: number;
  errorMessage?: string;
  timestamp: number;
}

// Utility types for platform implementations
export type PlatformName = 'amazon' | 'netflix' | 'dominos';

export interface PlatformRegistry {
  [key: string]: PlatformDetector;
}

export interface DOMManipulation {
  findElement(selectors: string[]): Element | null;
  waitForElement(selector: string, timeout?: number): Promise<Element | null>;
  typeText(input: HTMLInputElement, text: string): Promise<void>;
  clickElement(element: Element): Promise<void>;
  scrollToElement(element: Element): Promise<void>;
  wait(ms: number): Promise<void>;
}

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export interface PriceParsingResult {
  amount: number;
  currency: string;
  formatted: string;
  confidence: number;
}

export interface PlatformMetrics {
  platform: string;
  detectionCount: number;
  successfulApplications: number;
  failedApplications: number;
  averageApplicationTime: number;
  lastUsed: number;
}

// Export utility functions type
export interface PlatformUtils extends DOMManipulation {
  parsePrice(priceText: string, platform: string): PriceParsingResult | null;
  formatCurrency(amount: number, currency: string): string;
  showNotification(options: NotificationOptions): void;
  getMetrics(platform: string): PlatformMetrics;
  updateMetrics(platform: string, success: boolean, duration: number): void;
}