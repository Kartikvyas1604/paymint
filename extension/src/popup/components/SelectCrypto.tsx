/**
 * Select Crypto Component
 * Allows users to select crypto amount and gift card options
 */

import React, { useState } from 'react';
import { useBalance } from '../../hooks';
import { formatCurrency } from '../../utils';
import { PaymentData } from '../App';

interface SelectCryptoProps {
  onNext: (data: PaymentData) => void;
  walletAddress: string;
}

const SelectCrypto: React.FC<SelectCryptoProps> = ({ onNext, walletAddress }) => {
  const { balance, loading: balanceLoading } = useBalance(walletAddress);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('PYUSD');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<'payment' | 'gift-card'>('payment');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (mode === 'gift-card' && !recipientAddress) {
      alert('Please enter recipient wallet address');
      return;
    }

    onNext({
      amount: numAmount,
      currency,
      recipientAddress: mode === 'gift-card' ? recipientAddress : walletAddress,
      description: description || undefined
    });
  };

  return (
    <div className="select-crypto">
      <div className="mode-selector">
        <button
          className={`mode-btn ${mode === 'payment' ? 'active' : ''}`}
          onClick={() => setMode('payment')}
        >
          💳 Payment
        </button>
        <button
          className={`mode-btn ${mode === 'gift-card' ? 'active' : ''}`}
          onClick={() => setMode('gift-card')}
        >
          🎁 Gift Card
        </button>
      </div>

      <form onSubmit={handleSubmit} className="crypto-form">
        <div className="form-group">
          <label>Amount</label>
          <div className="amount-input">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="currency-select"
            >
              <option value="PYUSD">PYUSD</option>
              <option value="ETH">ETH</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
          
          {balance !== null && (
            <div className="balance-info">
              Balance: {formatCurrency(balance, currency)}
            </div>
          )}
        </div>

        {mode === 'gift-card' && (
          <div className="form-group">
            <label>Recipient Wallet Address</label>
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x..."
              pattern="^0x[a-fA-F0-9]{40}$"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label>Description (Optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={mode === 'gift-card' ? 'Gift message...' : 'Payment description...'}
            maxLength={100}
          />
        </div>

        <button type="submit" className="next-button">
          Continue →
        </button>
      </form>

      <style>{`
        .select-crypto {
          padding: 24px;
        }

        .mode-selector {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          background: rgba(0, 0, 0, 0.2);
          padding: 4px;
          border-radius: 8px;
        }

        .mode-btn {
          flex: 1;
          background: transparent;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mode-btn.active {
          background: rgba(255, 255, 255, 0.15);
          color: white;
        }

        .crypto-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group label {
          font-size: 14px;
          font-weight: 500;
          opacity: 0.9;
        }

        .amount-input {
          display: flex;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          overflow: hidden;
        }

        .amount-input input {
          flex: 1;
          background: transparent;
          border: none;
          color: white;
          padding: 12px 16px;
          font-size: 16px;
          outline: none;
        }

        .amount-input input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .currency-select {
          background: rgba(0, 0, 0, 0.3);
          border: none;
          color: white;
          padding: 12px 16px;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          cursor: pointer;
        }

        .currency-select option {
          background: #1a1a2e;
          color: white;
        }

        .form-group input[type="text"] {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
        }

        .form-group input[type="text"]::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .balance-info {
          font-size: 12px;
          opacity: 0.8;
          text-align: right;
        }

        .next-button {
          background: rgba(255, 255, 255, 0.15);
          border: 2px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 16px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }

        .next-button:hover {
          background: rgba(255, 255, 255, 0.25);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
        }
      `}</style>
    </div>
  );
};

export default SelectCrypto;