/**
 * Wallet Manager
 * Handles wallet connections and interactions
 */

import { WalletConnection } from '../../types/chrome';

export class WalletManager {
  private connection: WalletConnection | null = null;

  /**
   * Connect to MetaMask wallet
   */
  async connectWallet(): Promise<WalletConnection | null> {
    try {
      // Check if ethereum is available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        // Request account access
        const accounts = await ethereum.request({
          method: 'eth_requestAccounts'
        });

        if (accounts.length === 0) {
          throw new Error('No accounts found');
        }

        // Get chain ID
        const chainId = await ethereum.request({
          method: 'eth_chainId'
        });

        this.connection = {
          address: accounts[0],
          chainId: parseInt(chainId, 16),
          connected: true
        };

        // Store connection in Chrome storage
        await this.saveConnection(this.connection);

        return this.connection;
      } else {
        throw new Error('MetaMask is not installed');
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return null;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnectWallet(): Promise<void> {
    this.connection = null;
    await chrome.storage.local.remove('walletConnection');
  }

  /**
   * Get current wallet connection
   */
  async getConnection(): Promise<WalletConnection | null> {
    if (this.connection) {
      return this.connection;
    }

    // Try to load from storage
    const result = await chrome.storage.local.get('walletConnection');
    if (result.walletConnection) {
      this.connection = result.walletConnection;
      return this.connection;
    }

    return null;
  }

  /**
   * Check if wallet is connected
   */
  async isConnected(): Promise<boolean> {
    const connection = await this.getConnection();
    return connection?.connected || false;
  }

  /**
   * Get wallet address
   */
  async getAddress(): Promise<string | null> {
    const connection = await this.getConnection();
    return connection?.address || null;
  }

  /**
   * Get chain ID
   */
  async getChainId(): Promise<number | null> {
    const connection = await this.getConnection();
    return connection?.chainId || null;
  }

  /**
   * Switch to a specific chain
   */
  async switchChain(chainId: number): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }]
        });

        if (this.connection) {
          this.connection.chainId = chainId;
          await this.saveConnection(this.connection);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to switch chain:', error);
      return false;
    }
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<string | null> {
    try {
      const address = await this.getAddress();
      if (!address) {
        throw new Error('Wallet not connected');
      }

      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const ethereum = (window as any).ethereum;
        
        const signature = await ethereum.request({
          method: 'personal_sign',
          params: [message, address]
        });

        return signature;
      }
      return null;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }

  /**
   * Save connection to Chrome storage
   */
  private async saveConnection(connection: WalletConnection): Promise<void> {
    await chrome.storage.local.set({ walletConnection: connection });
  }
}

// Singleton instance
export const walletManager = new WalletManager();