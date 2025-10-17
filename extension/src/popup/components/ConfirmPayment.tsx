/**
 * Confirm Payment Component
 * Shows payment details and allows confirmation
 */

import React from 'react';
import { formatCurrency } from '../../utils';
import { PaymentData } from '../App';

interface ConfirmPaymentProps {
  paymentData: PaymentData;
  onConfirm: () => void;
  onBack: () => void;
  onError: (error: string) => void;
}

const ConfirmPayment: React.FC<ConfirmPaymentProps> = ({
  paymentData,
  onConfirm,
  onBack,
  onError
}) => {
  const isGiftCard = paymentData.recipientAddress !== undefined;

  return (
    <div className="confirm-payment">
      <div className="confirm-header">
        <h2>
          {isGiftCard ? '🎁 Confirm Gift Card' : '💳 Confirm Payment'}
        </h2>
        <p>Please review the details before proceeding</p>
      </div>

      <div className="payment-details">
        <div className="detail-row">
          <span className="label">Amount:</span>
          <span className="value">
            {formatCurrency(paymentData.amount, paymentData.currency)}
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Currency:</span>
          <span className="value">{paymentData.currency}</span>
        </div>

        {isGiftCard && (
          <div className="detail-row">
            <span className="label">Recipient:</span>
            <span className="value address">
              {paymentData.recipientAddress.slice(0, 6)}...
              {paymentData.recipientAddress.slice(-4)}
            </span>
          </div>
        )}

        {paymentData.description && (
          <div className="detail-row">
            <span className="label">Description:</span>
            <span className="value">{paymentData.description}</span>
          </div>
        )}

        <div className="detail-row total">
          <span className="label">Total:</span>
          <span className="value">
            {formatCurrency(paymentData.amount, paymentData.currency)}
          </span>
        </div>
      </div>

      <div className="security-notice">
        <div className="notice-icon">🔒</div>
        <div className="notice-text">
          <p>
            {isGiftCard 
              ? 'Your gift card will be encrypted and can only be redeemed by the recipient.'
              : 'This payment will be processed securely through PayPal USD.'
            }
          </p>
        </div>
      </div>

      <div className="action-buttons">
        <button className="back-button" onClick={onBack}>
          ← Back
        </button>
        <button className="confirm-button" onClick={onConfirm}>
          {isGiftCard ? 'Create Gift Card' : 'Process Payment'}
        </button>
      </div>

      <style>{`
        .confirm-payment {
          padding: 24px;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .confirm-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .confirm-header h2 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 700;
        }

        .confirm-header p {
          margin: 0;
          opacity: 0.8;
          font-size: 14px;
        }

        .payment-details {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row.total {
          margin-top: 8px;
          padding-top: 16px;
          border-top: 2px solid rgba(255, 255, 255, 0.2);
          font-weight: 600;
          font-size: 16px;
        }

        .label {
          opacity: 0.8;
          font-size: 14px;
        }

        .value {
          font-weight: 500;
        }

        .value.address {
          font-family: monospace;
          background: rgba(255, 255, 255, 0.1);
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
        }

        .security-notice {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
          border-radius: 8px;
          padding: 16px;
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .notice-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        .notice-text p {
          margin: 0;
          font-size: 13px;
          line-height: 1.4;
          opacity: 0.9;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .back-button,
        .confirm-button {
          flex: 1;
          padding: 16px 24px;
          border-radius: 8px;
          font-size: 16px;
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

        .confirm-button {
          background: rgba(34, 197, 94, 0.8);
          border: 2px solid rgba(34, 197, 94, 1);
          color: white;
        }

        .confirm-button:hover {
          background: rgba(34, 197, 94, 0.9);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default ConfirmPayment;