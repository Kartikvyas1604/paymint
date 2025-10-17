/**
 * Transaction Monitor
 * Monitors blockchain transactions and notifies users
 */

import { TransactionStatus } from '../../types/chrome';
import { apiClient } from './api-client';

export class TransactionMonitor {
  private monitoring: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start monitoring a transaction
   */
  async monitorTransaction(hash: string): Promise<void> {
    if (this.monitoring.has(hash)) {
      return; // Already monitoring
    }

    console.log(`Starting to monitor transaction: ${hash}`);

    const interval = setInterval(async () => {
      try {
        const response = await apiClient.getPaymentStatus(hash);
        
        if (response.success && response.data) {
          const status = response.data as TransactionStatus;
          
          // Notify about status change
          await this.notifyStatusChange(status);

          // Stop monitoring if transaction is complete
          if (status.status === 'confirmed' || status.status === 'failed') {
            this.stopMonitoring(hash);
          }
        }
      } catch (error) {
        console.error(`Failed to check transaction ${hash}:`, error);
      }
    }, 10000); // Check every 10 seconds

    this.monitoring.set(hash, interval);

    // Auto-stop monitoring after 1 hour
    setTimeout(() => {
      this.stopMonitoring(hash);
    }, 3600000);
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(hash: string): void {
    const interval = this.monitoring.get(hash);
    if (interval) {
      clearInterval(interval);
      this.monitoring.delete(hash);
      console.log(`Stopped monitoring transaction: ${hash}`);
    }
  }

  /**
   * Stop monitoring all transactions
   */
  stopAllMonitoring(): void {
    for (const [hash, interval] of this.monitoring) {
      clearInterval(interval);
    }
    this.monitoring.clear();
  }

  /**
   * Notify user about transaction status change
   */
  private async notifyStatusChange(status: TransactionStatus): Promise<void> {
    let title = 'Transaction Update';
    let message = '';
    let iconUrl = '/icons/icon48.png';

    switch (status.status) {
      case 'confirmed':
        title = '✅ Transaction Confirmed';
        message = `Transaction ${status.hash.slice(0, 10)}... has been confirmed`;
        break;
      case 'failed':
        title = '❌ Transaction Failed';
        message = `Transaction ${status.hash.slice(0, 10)}... has failed`;
        break;
      case 'pending':
        title = '⏳ Transaction Pending';
        message = `Transaction ${status.hash.slice(0, 10)}... is still pending`;
        break;
    }

    // Create notification
    chrome.notifications.create(status.hash, {
      type: 'basic',
      iconUrl,
      title,
      message
    });

    // Store notification in storage for popup to access
    const notifications = await this.getStoredNotifications();
    notifications.unshift({
      id: status.hash,
      title,
      message,
      timestamp: status.timestamp,
      read: false
    });

    // Keep only last 50 notifications
    const trimmedNotifications = notifications.slice(0, 50);
    
    await chrome.storage.local.set({ 
      notifications: trimmedNotifications 
    });
  }

  /**
   * Get stored notifications
   */
  private async getStoredNotifications(): Promise<any[]> {
    const result = await chrome.storage.local.get('notifications');
    return result.notifications || [];
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(id: string): Promise<void> {
    const notifications = await this.getStoredNotifications();
    const notification = notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      await chrome.storage.local.set({ notifications });
    }
  }

  /**
   * Clear all notifications
   */
  async clearNotifications(): Promise<void> {
    await chrome.storage.local.set({ notifications: [] });
  }
}

// Singleton instance
export const transactionMonitor = new TransactionMonitor();