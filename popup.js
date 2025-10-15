// PayMint Popup Script
class PayMintPopup {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadUserData();
        this.checkConnectionStatus();
        console.log('PayMint popup initialized');
    }

    setupEventListeners() {
        // Send Payment button
        document.getElementById('send-payment')?.addEventListener('click', () => {
            this.handleSendPayment();
        });

        // Receive Payment button
        document.getElementById('receive-payment')?.addEventListener('click', () => {
            this.handleReceivePayment();
        });

        // Transaction History button
        document.getElementById('transaction-history')?.addEventListener('click', () => {
            this.handleTransactionHistory();
        });

        // Scan QR button
        document.getElementById('scan-qr')?.addEventListener('click', () => {
            this.handleScanQR();
        });

        // Settings button
        document.getElementById('settings')?.addEventListener('click', () => {
            this.handleSettings();
        });
    }

    async loadUserData() {
        try {
            // Load user balance from storage
            const result = await chrome.storage.local.get(['userBalance', 'preferredCurrency']);
            const balance = result.userBalance || 0;
            const currency = result.preferredCurrency || 'USD';

            this.updateBalance(balance, currency);
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showError('Failed to load user data');
        }
    }

    updateBalance(amount, currency = 'USD') {
        const balanceElement = document.getElementById('balance-amount');
        const currencyElement = document.getElementById('balance-currency');
        
        if (balanceElement && currencyElement) {
            // Format currency based on type
            const formattedAmount = this.formatCurrency(amount, currency);
            balanceElement.textContent = formattedAmount;
            currencyElement.textContent = currency;
        }
    }

    formatCurrency(amount, currency) {
        if (currency === 'BTC') {
            return amount.toFixed(8);
        } else if (currency === 'ETH') {
            return amount.toFixed(6);
        } else {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
                minimumFractionDigits: 2
            }).format(amount);
        }
    }

    async handleSendPayment() {
        try {
            this.showLoading('send-payment');
            
            // Open send payment interface
            await this.openPaymentInterface('send');
            
        } catch (error) {
            console.error('Error handling send payment:', error);
            this.showError('Failed to open send payment interface');
        } finally {
            this.hideLoading('send-payment');
        }
    }

    async handleReceivePayment() {
        try {
            this.showLoading('receive-payment');
            
            // Generate or show receive address/QR code
            await this.openPaymentInterface('receive');
            
        } catch (error) {
            console.error('Error handling receive payment:', error);
            this.showError('Failed to open receive interface');
        } finally {
            this.hideLoading('receive-payment');
        }
    }

    async handleTransactionHistory() {
        try {
            this.showLoading('transaction-history');
            
            // Open transaction history
            const transactions = await this.getTransactionHistory();
            this.displayTransactionHistory(transactions);
            
        } catch (error) {
            console.error('Error loading transaction history:', error);
            this.showError('Failed to load transaction history');
        } finally {
            this.hideLoading('transaction-history');
        }
    }

    async handleScanQR() {
        try {
            this.showLoading('scan-qr');
            
            // Request camera permission and open QR scanner
            await this.openQRScanner();
            
        } catch (error) {
            console.error('Error opening QR scanner:', error);
            this.showError('Failed to open QR scanner');
        } finally {
            this.hideLoading('scan-qr');
        }
    }

    async handleSettings() {
        try {
            // Open settings page
            await chrome.tabs.create({
                url: chrome.runtime.getURL('settings.html')
            });
            
        } catch (error) {
            console.error('Error opening settings:', error);
            this.showError('Failed to open settings');
        }
    }

    async openPaymentInterface(type) {
        // Send message to background script to handle payment interface
        await chrome.runtime.sendMessage({
            action: 'openPaymentInterface',
            type: type
        });
    }

    async getTransactionHistory() {
        // Get transaction history from storage or API
        const result = await chrome.storage.local.get(['transactionHistory']);
        return result.transactionHistory || [];
    }

    displayTransactionHistory(transactions) {
        // For now, just log the transactions
        // In a full implementation, this would show a transaction list
        console.log('Transaction history:', transactions);
        this.showNotification('Transaction history loaded');
    }

    async openQRScanner() {
        // Request permission to access camera and open QR scanner
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Stop immediately, just checking permission
            
            // Open QR scanner interface
            await chrome.runtime.sendMessage({
                action: 'openQRScanner'
            });
            
        } catch (error) {
            throw new Error('Camera access denied');
        }
    }

    async checkConnectionStatus() {
        try {
            // Check network connectivity and wallet connection
            const isOnline = navigator.onLine;
            const walletConnected = await this.checkWalletConnection();
            
            this.updateConnectionStatus(isOnline && walletConnected);
            
        } catch (error) {
            console.error('Error checking connection status:', error);
            this.updateConnectionStatus(false);
        }
    }

    async checkWalletConnection() {
        // Check if wallet is connected
        const result = await chrome.storage.local.get(['walletConnected']);
        return result.walletConnected || false;
    }

    updateConnectionStatus(isConnected) {
        const statusElement = document.getElementById('connection-status');
        const indicator = statusElement?.querySelector('.status-indicator');
        const text = statusElement?.querySelector('.status-text');
        
        if (statusElement && indicator && text) {
            if (isConnected) {
                statusElement.style.background = '#f0fdf4';
                statusElement.style.borderColor = '#bbf7d0';
                indicator.style.background = '#22c55e';
                text.textContent = 'Connected';
                text.style.color = '#166534';
            } else {
                statusElement.style.background = '#fef2f2';
                statusElement.style.borderColor = '#fecaca';
                indicator.style.background = '#ef4444';
                text.textContent = 'Disconnected';
                text.style.color = '#991b1b';
            }
        }
    }

    showLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.add('loading');
            button.disabled = true;
        }
    }

    hideLoading(buttonId) {
        const button = document.getElementById(buttonId);
        if (button) {
            button.classList.remove('loading');
            button.disabled = false;
        }
    }

    showError(message) {
        // Create and show error notification
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '1000',
            animation: 'slideIn 0.3s ease-out',
            background: type === 'error' ? '#ef4444' : '#3b82f6'
        });
        
        document.body.appendChild(notification);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Utility method to communicate with content scripts
    async sendMessageToActiveTab(message) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                return await chrome.tabs.sendMessage(tab.id, message);
            }
        } catch (error) {
            console.error('Error sending message to active tab:', error);
        }
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PayMintPopup();
});

// Handle browser action clicks
chrome.action?.onClicked?.addListener((tab) => {
    console.log('PayMint extension clicked on tab:', tab.url);
});

// Add CSS animations dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);