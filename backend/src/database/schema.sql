-- PAYMINT Database Schema
-- SQLite database for PAYMINT backend services
-- Optimized for transaction processing and gift card management

-- Transactions table - Core transaction records
CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    platform TEXT NOT NULL CHECK(platform IN ('amazon', 'netflix', 'dominos')),
    crypto_currency TEXT NOT NULL CHECK(crypto_currency IN ('BTC', 'ETH', 'SOL', 'USDC', 'PYUSD')),
    crypto_amount TEXT NOT NULL, -- String to handle large decimals
    usd_amount REAL NOT NULL,
    tx_hash TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'confirmed', 'failed', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    network_fees REAL DEFAULT 0,
    service_fees REAL DEFAULT 0,
    exchange_rate REAL,
    user_ip TEXT,
    user_agent TEXT
);

-- Gift cards table - Generated gift card records
CREATE TABLE IF NOT EXISTS gift_cards (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    code TEXT NOT NULL, -- Encrypted gift card code
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'USD',
    provider TEXT, -- 'bitrefill' or 'reloadly'
    provider_order_id TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'used', 'expired', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    expires_at DATETIME,
    encrypted_with_lit BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- PayPal transfers table - PayPal/PYUSD specific transactions
CREATE TABLE IF NOT EXISTS paypal_transfers (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    paypal_order_id TEXT,
    paypal_payment_id TEXT,
    pyusd_amount TEXT, -- PYUSD amount before conversion
    usd_amount REAL,
    conversion_rate REAL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'completed', 'cancelled', 'failed')),
    webhook_received_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Crypto prices table - Price feeds from Pyth Network
CREATE TABLE IF NOT EXISTS crypto_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    currency TEXT NOT NULL,
    usd_rate REAL NOT NULL,
    confidence REAL, -- Pyth confidence interval
    source TEXT DEFAULT 'pyth', -- Price source (pyth, fallback)
    feed_id TEXT, -- Pyth feed ID
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME
);

-- Wallets table - User wallet tracking
CREATE TABLE IF NOT EXISTS wallets (
    address TEXT PRIMARY KEY,
    total_spent REAL DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_blocked BOOLEAN DEFAULT FALSE,
    risk_score INTEGER DEFAULT 0 CHECK(risk_score >= 0 AND risk_score <= 100)
);

-- Blockchain confirmations table - Transaction confirmation tracking
CREATE TABLE IF NOT EXISTS blockchain_confirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    network TEXT NOT NULL, -- ethereum, base, polygon, etc.
    block_number INTEGER,
    confirmations INTEGER DEFAULT 0,
    gas_used TEXT,
    gas_price TEXT,
    status TEXT CHECK(status IN ('pending', 'confirmed', 'failed')),
    checked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    confirmed_at DATETIME,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
);

-- Lit protocol keys table - Encrypted data management
CREATE TABLE IF NOT EXISTS lit_encrypted_data (
    id TEXT PRIMARY KEY,
    data_type TEXT NOT NULL, -- 'gift_card', 'wallet_key', etc.
    reference_id TEXT NOT NULL, -- gift_card.id, wallet.address, etc.
    encrypted_string TEXT NOT NULL,
    encrypted_symmetric_key TEXT NOT NULL,
    access_control_conditions TEXT NOT NULL, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accessed_at DATETIME
);

-- API rate limiting table - Track API usage
CREATE TABLE IF NOT EXISTS api_rate_limits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    requests_count INTEGER DEFAULT 1,
    window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_request DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- System logs table - Application logging
CREATE TABLE IF NOT EXISTS system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL CHECK(level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    service TEXT, -- paypal, pyth, blockscout, lit
    transaction_id TEXT,
    wallet_address TEXT,
    metadata TEXT, -- JSON string for additional data
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_address ON transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_platform ON transactions(platform);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_hash ON transactions(tx_hash);

CREATE INDEX IF NOT EXISTS idx_gift_cards_transaction_id ON gift_cards(transaction_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_platform ON gift_cards(platform);

CREATE INDEX IF NOT EXISTS idx_paypal_transfers_transaction_id ON paypal_transfers(transaction_id);
CREATE INDEX IF NOT EXISTS idx_paypal_transfers_status ON paypal_transfers(status);
CREATE INDEX IF NOT EXISTS idx_paypal_transfers_paypal_order_id ON paypal_transfers(paypal_order_id);

CREATE INDEX IF NOT EXISTS idx_crypto_prices_currency ON crypto_prices(currency);
CREATE INDEX IF NOT EXISTS idx_crypto_prices_updated_at ON crypto_prices(updated_at);

CREATE INDEX IF NOT EXISTS idx_wallets_last_seen ON wallets(last_seen);
CREATE INDEX IF NOT EXISTS idx_wallets_is_blocked ON wallets(is_blocked);

CREATE INDEX IF NOT EXISTS idx_blockchain_confirmations_tx_hash ON blockchain_confirmations(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_confirmations_status ON blockchain_confirmations(status);

CREATE INDEX IF NOT EXISTS idx_lit_encrypted_data_reference_id ON lit_encrypted_data(reference_id);
CREATE INDEX IF NOT EXISTS idx_lit_encrypted_data_data_type ON lit_encrypted_data(data_type);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_ip_endpoint ON api_rate_limits(ip_address, endpoint);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_window_start ON api_rate_limits(window_start);

CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON system_logs(service);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_transactions_updated_at
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN OLD.updated_at = NEW.updated_at OR NEW.updated_at IS NULL
BEGIN
    UPDATE transactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger to update wallet statistics
CREATE TRIGGER IF NOT EXISTS update_wallet_stats_on_transaction
    AFTER UPDATE ON transactions
    FOR EACH ROW
    WHEN NEW.status = 'confirmed' AND OLD.status != 'confirmed'
BEGIN
    INSERT OR REPLACE INTO wallets (address, total_spent, transaction_count, first_seen, last_seen)
    VALUES (
        NEW.wallet_address,
        COALESCE((SELECT total_spent FROM wallets WHERE address = NEW.wallet_address), 0) + NEW.usd_amount,
        COALESCE((SELECT transaction_count FROM wallets WHERE address = NEW.wallet_address), 0) + 1,
        COALESCE((SELECT first_seen FROM wallets WHERE address = NEW.wallet_address), NEW.created_at),
        NEW.updated_at
    );
END;

-- Clean up old price data (keep only last 24 hours)
CREATE TRIGGER IF NOT EXISTS cleanup_old_prices
    AFTER INSERT ON crypto_prices
    FOR EACH ROW
BEGIN
    DELETE FROM crypto_prices 
    WHERE currency = NEW.currency 
    AND updated_at < datetime('now', '-1 day')
    AND id != NEW.id;
END;