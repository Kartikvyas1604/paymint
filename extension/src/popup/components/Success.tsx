/**
 * Success Component
 * Shows successful payment completion
 */

import React from 'react';
import { formatTxHash, getExplorerUrl } from '../../utils';

interface SuccessProps {
  transactionHash: string | null;
  onReset: () => void;
}

const Success: React.FC<SuccessProps> = ({ transactionHash, onReset }) => {
  const handleViewTransaction = () => {
    if (transactionHash) {
      const url = getExplorerUrl(1, transactionHash, 'tx'); // Default to Ethereum
      chrome.tabs.create({ url });
    }
  };

  const handleCopyHash = async () => {
    if (transactionHash) {
      try {
        await navigator.clipboard.writeText(transactionHash);
        // Could show a toast notification here
        console.log('Transaction hash copied to clipboard');
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  return (
    <div className="success">
      <div className="success-content">
        <div className="success-icon">
          <div className="checkmark">✓</div>
        </div>

        <h2>Payment Successful!</h2>
        <p>Your transaction has been processed successfully.</p>

        {transactionHash && (
          <div className="transaction-details">
            <div className="tx-hash">
              <label>Transaction Hash:</label>
              <div className="hash-display">
                <span className="hash-text">
                  {formatTxHash(transactionHash)}
                </span>
                <button 
                  className="copy-btn"
                  onClick={handleCopyHash}
                  title="Copy full hash"
                >
                  📋
                </button>
              </div>
            </div>

            <button 
              className="view-tx-btn"
              onClick={handleViewTransaction}
            >
              View on Explorer →
            </button>
          </div>
        )}

        <div className="success-message">
          <div className="message-icon">🎉</div>
          <p>
            Your payment has been completed and is now being confirmed on the blockchain. 
            You'll receive a notification once it's fully confirmed.
          </p>
        </div>

        <div className="action-buttons">
          <button className="new-payment-btn" onClick={onReset}>
            Make Another Payment
          </button>
        </div>
      </div>

      <style>{`
        .success {
          padding: 24px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .success-content {
          text-align: center;
          max-width: 320px;
        }

        .success-icon {
          margin-bottom: 24px;
        }

        .checkmark {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          color: white;
          margin: 0 auto;
          animation: successPulse 0.6s ease-out;
        }

        @keyframes successPulse {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .success h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          color: rgba(34, 197, 94, 1);
        }

        .success p {
          margin: 0 0 24px 0;
          opacity: 0.9;
          line-height: 1.5;
        }

        .transaction-details {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .tx-hash {
          margin-bottom: 16px;
        }

        .tx-hash label {
          display: block;
          font-size: 12px;
          opacity: 0.8;
          margin-bottom: 8px;
        }

        .hash-display {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.1);
          padding: 8px 12px;
          border-radius: 6px;
        }

        .hash-text {
          font-family: monospace;
          font-size: 14px;
          flex: 1;
        }

        .copy-btn {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: background 0.2s ease;
        }

        .copy-btn:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .view-tx-btn {
          width: 100%;
          background: rgba(59, 130, 246, 0.8);
          border: none;
          color: white;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-tx-btn:hover {
          background: rgba(59, 130, 246, 0.9);
          transform: translateY(-1px);
        }

        .success-message {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 12px;
          text-align: left;
        }

        .message-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .success-message p {
          margin: 0;
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.9;
        }

        .new-payment-btn {
          width: 100%;
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .new-payment-btn:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default Success;