/**
 * Connect Wallet Component
 * Handles wallet connection flow
 */

import React from 'react';

interface ConnectWalletProps {
  onConnect: () => Promise<void>;
}

const ConnectWallet: React.FC<ConnectWalletProps> = ({ onConnect }) => {
  const [connecting, setConnecting] = React.useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await onConnect();
    } catch (error) {
      console.error('Connection failed:', error);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="connect-wallet">
      <div className="connect-content">
        <div className="connect-icon">
          <span className="wallet-icon">👛</span>
        </div>
        
        <h2>Connect Your Wallet</h2>
        <p>Connect your wallet to start using PAYMINT for crypto payments and gift cards.</p>
        
        <div className="connect-options">
          <button 
            className="connect-button"
            onClick={handleConnect}
            disabled={connecting}
          >
            {connecting ? (
              <>
                <span className="spinner-small"></span>
                Connecting...
              </>
            ) : (
              <>
                <span className="metamask-icon">🦊</span>
                Connect MetaMask
              </>
            )}
          </button>
        </div>
        
        <div className="connect-info">
          <p className="info-text">
            Don't have MetaMask? 
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="download-link"
            >
              Download here
            </a>
          </p>
        </div>
      </div>

      <style>{`
        .connect-wallet {
          padding: 40px 24px;
          text-align: center;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .connect-content {
          max-width: 280px;
        }

        .connect-icon {
          margin-bottom: 24px;
        }

        .wallet-icon {
          font-size: 48px;
          display: block;
        }

        .connect-wallet h2 {
          margin: 0 0 12px 0;
          font-size: 24px;
          font-weight: 700;
        }

        .connect-wallet p {
          margin: 0 0 32px 0;
          opacity: 0.9;
          line-height: 1.5;
        }

        .connect-button {
          width: 100%;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          backdrop-filter: blur(10px);
        }

        .connect-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
        }

        .connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .metamask-icon {
          font-size: 20px;
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .connect-info {
          margin-top: 24px;
        }

        .info-text {
          font-size: 14px;
          opacity: 0.8;
          margin: 0;
        }

        .download-link {
          color: #60a5fa;
          text-decoration: none;
          font-weight: 500;
          margin-left: 4px;
        }

        .download-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};

export default ConnectWallet;