/**
 * Processing Component
 * Shows payment processing status
 */

import React, { useEffect, useState } from 'react';
import { usePayment } from '../../hooks';
import { PaymentData } from '../App';

interface ProcessingProps {
  paymentData: PaymentData;
  onSuccess: (txHash: string) => void;
  onError: (error: string) => void;
}

const Processing: React.FC<ProcessingProps> = ({
  paymentData,
  onSuccess,
  onError
}) => {
  const { createPayment, executePayment } = usePayment();
  const [status, setStatus] = useState('Initializing payment...');
  const [step, setStep] = useState(1);

  useEffect(() => {
    processPayment();
  }, []);

  const processPayment = async () => {
    try {
      // Step 1: Create payment
      setStatus('Creating payment order...');
      setStep(1);
      
      const payment = await createPayment(
        paymentData.amount,
        paymentData.currency,
        paymentData.description
      );

      // Step 2: Execute payment
      setStatus('Processing payment...');
      setStep(2);
      
      const result = await executePayment(payment.id);

      // Step 3: Success
      setStatus('Payment completed successfully!');
      setStep(3);

      // Simulate transaction hash for demo
      const mockTxHash = '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('');
      
      setTimeout(() => {
        onSuccess(mockTxHash);
      }, 1000);

    } catch (error) {
      console.error('Payment processing failed:', error);
      onError(error instanceof Error ? error.message : 'Payment processing failed');
    }
  };

  const steps = [
    { number: 1, title: 'Creating Order', icon: '📋' },
    { number: 2, title: 'Processing Payment', icon: '💳' },
    { number: 3, title: 'Confirming Transaction', icon: '✅' }
  ];

  return (
    <div className="processing">
      <div className="processing-content">
        <div className="processing-icon">
          <div className="spinner-large"></div>
        </div>

        <h2>Processing Payment</h2>
        <p className="status-text">{status}</p>

        <div className="progress-steps">
          {steps.map((stepInfo) => (
            <div 
              key={stepInfo.number}
              className={`step ${step >= stepInfo.number ? 'active' : ''} ${step > stepInfo.number ? 'completed' : ''}`}
            >
              <div className="step-icon">
                {step > stepInfo.number ? '✓' : stepInfo.icon}
              </div>
              <div className="step-title">{stepInfo.title}</div>
            </div>
          ))}
        </div>

        <div className="payment-summary">
          <div className="summary-row">
            <span>Amount:</span>
            <span>{paymentData.amount} {paymentData.currency}</span>
          </div>
          {paymentData.description && (
            <div className="summary-row">
              <span>Description:</span>
              <span>{paymentData.description}</span>
            </div>
          )}
        </div>

        <div className="processing-note">
          <p>Please do not close this window while processing...</p>
        </div>
      </div>

      <style>{`
        .processing {
          padding: 24px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .processing-content {
          text-align: center;
          max-width: 300px;
        }

        .processing-icon {
          margin-bottom: 24px;
        }

        .spinner-large {
          width: 60px;
          height: 60px;
          border: 4px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .processing h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
        }

        .status-text {
          margin: 0 0 32px 0;
          opacity: 0.9;
          font-size: 14px;
        }

        .progress-steps {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 32px;
        }

        .step {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 0;
          opacity: 0.5;
          transition: opacity 0.3s ease;
        }

        .step.active {
          opacity: 1;
        }

        .step.completed {
          opacity: 0.8;
        }

        .step-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }

        .step.active .step-icon {
          background: rgba(34, 197, 94, 0.8);
          animation: pulse 2s infinite;
        }

        .step.completed .step-icon {
          background: rgba(34, 197, 94, 1);
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .step-title {
          font-size: 14px;
          font-weight: 500;
        }

        .payment-summary {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 24px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .summary-row:last-child {
          margin-bottom: 0;
        }

        .processing-note {
          opacity: 0.7;
        }

        .processing-note p {
          margin: 0;
          font-size: 12px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default Processing;