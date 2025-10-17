// Additional Chrome extension type definitions
// These extend the @types/chrome package

declare namespace chrome {
  namespace storage {
    interface StorageArea {
      // Add any custom storage methods if needed
    }
  }
  
  namespace runtime {
    interface MessageSender {
      // Add any custom message sender properties if needed
    }
  }
  
  namespace tabs {
    interface Tab {
      // Add any custom tab properties if needed  
    }
  }
}

// Extension-specific types
export interface PaymentRequest {
  amount: number;
  currency: string;
  recipientAddress: string;
  description?: string;
}

export interface GiftCardData {
  id: string;
  amount: number;
  currency: string;
  encryptedData: string;
  expirationDate: string;
  isRedeemed: boolean;
}

export interface WalletConnection {
  address: string;
  chainId: number;
  connected: boolean;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  timestamp: string;
}

export {};