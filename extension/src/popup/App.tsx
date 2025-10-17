/**
 * Main App component for PAYMINT popup
 */

import React, { useState, useEffect } from 'react';
import { useWallet, useNotifications } from '../hooks';
import ConnectWallet from './components/ConnectWallet';
import SelectCrypto from './components/SelectCrypto';
import ConfirmPayment from './components/ConfirmPayment';
import Processing from './components/Processing';
import Success from './components/Success';
import ErrorScreen from './components/ErrorScreen';

export type AppState = 
  | 'connecting'
  | 'select-crypto'
  | 'confirm-payment'
  | 'processing'
  | 'success'
  | 'error';

export interface PaymentData {
  amount: number;
  currency: string;
  recipientAddress: string;
  description?: string;
}

const App: React.FC = () => {
  const { connection, loading: walletLoading, connect, disconnect } = useWallet();
  const { notifications, unreadCount } = useNotifications();
  
  const [appState, setAppState] = useState<AppState>('connecting');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Initialize app state based on wallet connection
  useEffect(() => {
    if (!walletLoading) {
      if (connection?.connected) {
        setAppState('select-crypto');
      } else {
        setAppState('connecting');
      }
    }
  }, [connection, walletLoading]);

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      await connect();
      setAppState('select-crypto');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
      setAppState('error');
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      await disconnect();
      setAppState('connecting');
      setPaymentData(null);
      setError(null);
      setTransactionHash(null);
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  // Handle payment flow
  const handlePaymentInit = (data: PaymentData) => {
    setPaymentData(data);
    setAppState('confirm-payment');
  };

  const handlePaymentConfirm = () => {
    setAppState('processing');
  };

  const handlePaymentSuccess = (txHash: string) => {
    setTransactionHash(txHash);
    setAppState('success');
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
    setAppState('error');
  };

  // Reset to initial state
  const handleReset = () => {
    setPaymentData(null);
    setError(null);
    setTransactionHash(null);
    setAppState('select-crypto');
  };

  // Render loading state
  if (walletLoading) {
    return (
      <div className="app loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading PAYMINT...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">💳</span>
            <h1>PAYMINT</h1>
          </div>
          
          {connection?.connected && (
            <div className="header-actions">
              {unreadCount > 0 && (
                <div className="notification-badge">
                  <span className="badge-count">{unreadCount}</span>
                </div>
              )}
              <button 
                className="disconnect-btn"
                onClick={handleDisconnect}
                title="Disconnect Wallet"
              >
                🔌
              </button>
            </div>
          )}
        </div>
        
        {connection?.connected && (
          <div className="wallet-info">
            <span className="wallet-address">
              {connection.address.slice(0, 6)}...{connection.address.slice(-4)}
            </span>
            <span className="chain-name">
              {connection.chainId === 1 ? 'Ethereum' : 
               connection.chainId === 137 ? 'Polygon' : 
               connection.chainId === 8453 ? 'Base' : 
               `Chain ${connection.chainId}`}
            </span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="app-main">
        {appState === 'connecting' && (
          <ConnectWallet onConnect={handleConnect} />
        )}
        
        {appState === 'select-crypto' && (
          <SelectCrypto 
            onNext={handlePaymentInit}
            walletAddress={connection?.address || ''}
          />
        )}
        
        {appState === 'confirm-payment' && paymentData && (
          <ConfirmPayment
            paymentData={paymentData}
            onConfirm={handlePaymentConfirm}
            onBack={() => setAppState('select-crypto')}
            onError={handlePaymentError}
          />
        )}
        
        {appState === 'processing' && paymentData && (
          <Processing
            paymentData={paymentData}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        )}
        
        {appState === 'success' && (
          <Success
            transactionHash={transactionHash}
            onReset={handleReset}
          />
        )}
        
        {appState === 'error' && (
          <ErrorScreen
            error={error || 'An unknown error occurred'}
            onRetry={handleReset}
            onBack={() => setAppState('connecting')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-links">
          <a href="#" onClick={(e) => { e.preventDefault(); /* Open help */ }}>
            Help
          </a>
          <a href="#" onClick={(e) => { e.preventDefault(); /* Open settings */ }}>
            Settings
          </a>
        </div>
        <div className="footer-info">
          <span>ETHGlobal ETHOnline 2025</span>
        </div>
      </footer>

      {/* Global Styles */}
      <style>{`
        .app {
          width: 350px;
          height: 600px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          display: flex;
          flex-direction: column;
        }

        .loading {
          justify-content: center;
          align-items: center;
        }

        .loading-spinner {
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .app-header {
          background: rgba(0, 0, 0, 0.2);
          padding: 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .logo-icon {
          font-size: 20px;
        }

        .logo h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .notification-badge {
          position: relative;
        }

        .badge-count {
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 10px;
          min-width: 16px;
          text-align: center;
        }

        .disconnect-btn {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          padding: 6px 8px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }

        .disconnect-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12px;
          opacity: 0.9;
        }

        .wallet-address {
          background: rgba(255, 255, 255, 0.2);
          padding: 4px 8px;
          border-radius: 4px;
          font-family: monospace;
        }

        .chain-name {
          font-weight: 500;
        }

        .app-main {
          flex: 1;
          overflow-y: auto;
        }

        .app-footer {
          background: rgba(0, 0, 0, 0.2);
          padding: 12px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
        }

        .footer-links {
          display: flex;
          gap: 16px;
          margin-bottom: 4px;
        }

        .footer-links a {
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
        }

        .footer-links a:hover {
          color: white;
        }

        .footer-info {
          opacity: 0.6;
        }
      `}</style>
    </div>
  );
};

export default App;