/**
 * Platform Integrations Index
 * 
 * Exports all supported platform integrations for PAYMINT Chrome extension.
 * Currently supports Amazon, Netflix, and Domino's with extensible architecture.
 */

import { PlatformDetector, PlatformRegistry } from './types';
import AmazonPlatform from './amazon';
import NetflixPlatform from './netflix';
import DominosPlatform from './dominos';

// Registry of all supported platforms
export const SUPPORTED_PLATFORMS: PlatformRegistry = {
  amazon: AmazonPlatform,
  netflix: NetflixPlatform,
  dominos: DominosPlatform
};

// Array of platform instances for iteration
export const PLATFORM_LIST: PlatformDetector[] = [
  AmazonPlatform,
  NetflixPlatform,
  DominosPlatform
];

/**
 * Detect which platform the current page belongs to
 */
export function detectCurrentPlatform(): PlatformDetector | null {
  for (const platform of PLATFORM_LIST) {
    if (platform.isDetected()) {
      console.log(`✅ Platform detected: ${platform.displayName}`);
      return platform;
    }
  }
  
  console.log('ℹ️  No supported platform detected on this page');
  return null;
}

/**
 * Get platform by name
 */
export function getPlatform(name: string): PlatformDetector | null {
  const platform = SUPPORTED_PLATFORMS[name.toLowerCase()];
  return platform || null;
}

/**
 * Check if current domain is supported by any platform
 */
export function isSupportedDomain(hostname: string): boolean {
  return PLATFORM_LIST.some(platform => 
    platform.supportedDomains.some(domain => hostname.includes(domain))
  );
}

/**
 * Get all supported domains across all platforms
 */
export function getAllSupportedDomains(): string[] {
  const domains: string[] = [];
  
  PLATFORM_LIST.forEach(platform => {
    domains.push(...platform.supportedDomains);
  });
  
  return [...new Set(domains)]; // Remove duplicates
}

/**
 * Get platform statistics for monitoring
 */
export function getPlatformStats(): { [key: string]: any } {
  const stats: { [key: string]: any } = {};
  
  PLATFORM_LIST.forEach(platform => {
    stats[platform.name] = {
      name: platform.name,
      displayName: platform.displayName,
      supportedDomains: platform.supportedDomains.length,
      domains: platform.supportedDomains
    };
  });
  
  return stats;
}

// Export individual platforms
export { AmazonPlatform, NetflixPlatform, DominosPlatform };

// Export types
export * from './types';

// Default export for main detection function
export default detectCurrentPlatform;