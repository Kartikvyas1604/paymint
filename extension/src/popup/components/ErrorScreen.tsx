/**
 * Error Screen Component
 * Shows error messages and retry options
 */

import React from 'react';

interface ErrorScreenProps {
  error: string;
  onRetry: () => void;
  onBack: () => void;
}

const ErrorScreen: React.FC<ErrorScreenProps> = ({ error, onRetry, onBack }) => {
  const getErrorIcon = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('wallet')) return '👛';
    if (errorMessage.toLowerCase().includes('network')) return '🌐';
    if (errorMessage.toLowerCase().includes('payment')) return '💳';
    if (errorMessage.toLowerCase().includes('insufficient')) return '💰';
    return '⚠️';
  };

  const getErrorTitle = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('wallet')) return 'Wallet Error';
    if (errorMessage.toLowerCase().includes('network')) return 'Network Error';
    if (errorMessage.toLowerCase().includes('payment')) return 'Payment Error';
    if (errorMessage.toLowerCase().includes('insufficient')) return 'Insufficient Balance';
    return 'Something Went Wrong';
  };

  const getSuggestion = (errorMessage: string) => {
    if (errorMessage.toLowerCase().includes('wallet')) {
      return 'Please check your wallet connection and try again.';
    }
    if (errorMessage.toLowerCase().includes('network')) {
      return 'Please check your internet connection and try again.';
    }
    if (errorMessage.toLowerCase().includes('insufficient')) {
      return 'Please ensure you have sufficient balance in your wallet.';
    }
    if (errorMessage.toLowerCase().includes('rejected')) {
      return 'The transaction was rejected. Please try again.';
    }
    return 'Please try again or contact support if the problem persists.';
  };

  return (
    <div className="error-screen">
      <div className="error-content">
        <div className="error-icon">
          <span className="error-emoji">{getErrorIcon(error)}</span>
        </div>

        <h2>{getErrorTitle(error)}</h2>
        
        <div className="error-details">
          <p className="error-message">{error}</p>
          <p className="error-suggestion">{getSuggestion(error)}</p>
        </div>

        <div className="error-actions">
          <button className="back-button" onClick={onBack}>
            ← Go Back
          </button>
          <button className="retry-button" onClick={onRetry}>
            🔄 Try Again
          </button>
        </div>

        <div className="help-section">
          <h3>Need Help?</h3>
          <div className="help-links">
            <a href="#" onClick={(e) => { e.preventDefault(); /* Open support */ }}>
              📞 Contact Support
            </a>
            <a href="#" onClick={(e) => { e.preventDefault(); /* Open FAQ */ }}>
              ❓ View FAQ
            </a>
          </div>
        </div>
      </div>

      <style>{`
        .error-screen {
          padding: 24px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .error-content {
          text-align: center;
          max-width: 320px;
        }

        .error-icon {
          margin-bottom: 24px;
        }

        .error-emoji {
          font-size: 60px;
          display: block;
          filter: grayscale(0.3);
        }

        .error-screen h2 {
          margin: 0 0 16px 0;
          font-size: 20px;
          font-weight: 700;
          color: #ef4444;
        }

        .error-details {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
          text-align: left;
        }

        .error-message {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 500;
          color: #fecaca;
        }

        .error-suggestion {
          margin: 0;
          font-size: 13px;
          opacity: 0.9;
          line-height: 1.4;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
        }

        .back-button,
        .retry-button {
          flex: 1;
          padding: 14px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .back-button {
          background: rgba(255, 255, 255, 0.1);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .back-button:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .retry-button {
          background: rgba(34, 197, 94, 0.8);
          border: 2px solid rgba(34, 197, 94, 1);
          color: white;
        }

        .retry-button:hover {
          background: rgba(34, 197, 94, 0.9);
          transform: translateY(-1px);
        }

        .help-section {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
        }

        .help-section h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          opacity: 0.9;
        }

        .help-links {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .help-links a {
          color: #60a5fa;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 6px;
          background: rgba(96, 165, 250, 0.1);
          transition: all 0.2s ease;
        }

        .help-links a:hover {
          background: rgba(96, 165, 250, 0.2);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default ErrorScreen;