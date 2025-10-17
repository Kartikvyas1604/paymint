/**
 * Service Worker for PAYMINT Chrome Extension
 * Handles background tasks, message passing, and extension lifecycle
 */

import { apiClient } from './api-client';
import { walletManager } from './wallet-manager';
import { transactionMonitor } from './transaction-monitor';

// Listen for extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('PAYMINT extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set up initial extension state
    await chrome.storage.local.set({
      settings: {
        notifications: true,
        autoRedeem: false,
        preferredCurrency: 'PYUSD'
      },
      notifications: [],
      giftCards: []
    });

    // Open welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('popup.html')
    });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Indicates we will send a response asynchronously
});

// Handle messages
async function handleMessage(request: any, sender: chrome.runtime.MessageSender) {
  try {
    console.log('Received message:', request.type, request);

    switch (request.type) {
      case 'CONNECT_WALLET':
        return await walletManager.connectWallet();

      case 'DISCONNECT_WALLET':
        await walletManager.disconnectWallet();
        return { success: true };

      case 'GET_WALLET_CONNECTION':
        return await walletManager.getConnection();

      case 'SIGN_MESSAGE':
        return await walletManager.signMessage(request.message);

      case 'CREATE_PAYMENT':
        return await apiClient.createPayPalPayment(
          request.amount,
          request.currency,
          request.description
        );

      case 'EXECUTE_PAYMENT':
        return await apiClient.executePayPalPayment(
          request.orderId,
          request.payerId
        );

      case 'CREATE_GIFT_CARD':
        const result = await apiClient.createGiftCard(
          request.amount,
          request.currency,
          request.recipientAddress,
          request.senderAddress,
          request.message
        );
        
        // Store gift card locally
        if (result.success) {
          await storeGiftCard(result.data);
        }
        
        return result;

      case 'REDEEM_GIFT_CARD':
        return await apiClient.redeemGiftCard(
          request.giftCardId,
          request.walletAddress
        );

      case 'GET_PAYMENT_STATUS':
        return await apiClient.getPaymentStatus(request.paymentId);

      case 'MONITOR_TRANSACTION':
        await transactionMonitor.monitorTransaction(request.hash);
        return { success: true };

      case 'GET_BALANCE':
        return await apiClient.getPYUSDBalance(request.walletAddress);

      case 'HEALTH_CHECK':
        return await apiClient.checkHealth();

      case 'GET_NOTIFICATIONS':
        const notifications = await chrome.storage.local.get('notifications');
        return notifications.notifications || [];

      case 'MARK_NOTIFICATION_READ':
        await transactionMonitor.markNotificationRead(request.id);
        return { success: true };

      case 'CLEAR_NOTIFICATIONS':
        await transactionMonitor.clearNotifications();
        return { success: true };

      default:
        throw new Error(`Unknown message type: ${request.type}`);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Store gift card in local storage
async function storeGiftCard(giftCard: any) {
  const result = await chrome.storage.local.get('giftCards');
  const giftCards = result.giftCards || [];
  
  giftCards.push({
    ...giftCard,
    createdAt: new Date().toISOString()
  });
  
  await chrome.storage.local.set({ giftCards });
}

// Alarm handler for periodic tasks
chrome.alarms.onAlarm.addListener(async (alarm) => {
  console.log('Alarm triggered:', alarm.name);
  
  switch (alarm.name) {
    case 'health_check':
      // Periodic health check
      try {
        const health = await apiClient.checkHealth();
        if (!health.success) {
          console.warn('Backend health check failed:', health.error);
        }
      } catch (error) {
        console.error('Health check error:', error);
      }
      break;
  }
});

// Set up periodic alarms
chrome.runtime.onStartup.addListener(() => {
  // Health check every 5 minutes
  chrome.alarms.create('health_check', { periodInMinutes: 5 });
});

// Handle notification clicks
chrome.notifications.onClicked.addListener(async (notificationId) => {
  console.log('Notification clicked:', notificationId);
  
  // Mark as read
  await transactionMonitor.markNotificationRead(notificationId);
  
  // Open popup to show details
  chrome.action.openPopup();
  
  // Clear the notification
  chrome.notifications.clear(notificationId);
});

// Handle action (toolbar button) clicks
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension action clicked');
  // The popup will open automatically
});

// Clean up when extension is disabled/uninstalled
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension suspending, cleaning up...');
  transactionMonitor.stopAllMonitoring();
});

console.log('PAYMINT service worker loaded successfully');