/**
 * Custom React hooks for PAYMINT extension
 */

import { useState, useEffect, useCallback } from 'react';
import { messaging, storage } from '../utils';
import { WalletConnection } from '../../types/chrome';

/**
 * Hook for wallet connection state
 */
export function useWallet() {
  const [connection, setConnection] = useState<WalletConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await messaging.sendToBackground('CONNECT_WALLET');
      
      if (result) {
        setConnection(result);
        return result;
      } else {
        throw new Error('Failed to connect wallet');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      await messaging.sendToBackground('DISCONNECT_WALLET');
      setConnection(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Disconnection failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await messaging.sendToBackground('GET_WALLET_CONNECTION');
      setConnection(result);
    } catch (err) {
      console.error('Failed to refresh wallet connection:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    connection,
    loading,
    error,
    isConnected: !!connection?.connected,
    connect,
    disconnect,
    refresh
  };
}

/**
 * Hook for managing local storage
 */
export function useStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadValue() {
      try {
        const stored = await storage.get<T>(key);
        if (stored !== null) {
          setValue(stored);
        }
      } catch (error) {
        console.error(`Failed to load ${key} from storage:`, error);
      } finally {
        setLoading(false);
      }
    }

    loadValue();
  }, [key]);

  const updateValue = useCallback(async (newValue: T) => {
    try {
      setValue(newValue);
      await storage.set(key, newValue);
    } catch (error) {
      console.error(`Failed to save ${key} to storage:`, error);
    }
  }, [key]);

  return [value, updateValue, loading] as const;
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const result = await messaging.sendToBackground('GET_NOTIFICATIONS');
      setNotifications(result);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await messaging.sendToBackground('MARK_NOTIFICATION_READ', { id });
      await refresh();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, [refresh]);

  const clearAll = useCallback(async () => {
    try {
      await messaging.sendToBackground('CLEAR_NOTIFICATIONS');
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    loading,
    unreadCount,
    refresh,
    markAsRead,
    clearAll
  };
}

/**
 * Hook for payment creation
 */
export function usePayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPayment = useCallback(async (amount: number, currency: string, description?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await messaging.sendToBackground('CREATE_PAYMENT', {
        amount,
        currency,
        description
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Payment creation failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executePayment = useCallback(async (orderId: string, payerId?: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await messaging.sendToBackground('EXECUTE_PAYMENT', {
        orderId,
        payerId
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Payment execution failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment execution failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createPayment,
    executePayment
  };
}

/**
 * Hook for gift cards
 */
export function useGiftCards() {
  const [giftCards, setGiftCards] = useStorage<any[]>('giftCards', []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGiftCard = useCallback(async (
    amount: number,
    currency: string,
    recipientAddress: string,
    senderAddress: string,
    message?: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      const result = await messaging.sendToBackground('CREATE_GIFT_CARD', {
        amount,
        currency,
        recipientAddress,
        senderAddress,
        message
      });

      if (result.success) {
        // The gift card will be automatically stored by the background script
        // Refresh our local state
        const stored = await storage.get<any[]>('giftCards');
        if (stored) {
          setGiftCards(stored);
        }
        
        return result.data;
      } else {
        throw new Error(result.error || 'Gift card creation failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gift card creation failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [setGiftCards]);

  const redeemGiftCard = useCallback(async (giftCardId: string, walletAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await messaging.sendToBackground('REDEEM_GIFT_CARD', {
        giftCardId,
        walletAddress
      });

      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error || 'Gift card redemption failed');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Redemption failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    giftCards,
    loading,
    error,
    createGiftCard,
    redeemGiftCard
  };
}

/**
 * Hook for balance checking
 */
export function useBalance(walletAddress: string | null) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!walletAddress) {
      setBalance(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await messaging.sendToBackground('GET_BALANCE', {
        walletAddress
      });

      if (result.success) {
        setBalance(result.balance);
      } else {
        throw new Error(result.error || 'Failed to fetch balance');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Balance fetch failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    balance,
    loading,
    error,
    refresh
  };
}