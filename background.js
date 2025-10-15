// PayMint Background Service Worker
class PayMintBackground {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeExtension();
        console.log('PayMint background service worker initialized');
    }

    setupEventListeners() {
        // Handle extension installation
        chrome.runtime.onInstalled.addListener((details) => {
            this.handleInstallation(details);
        });

        // Handle extension startup
        chrome.runtime.onStartup.addListener(() => {
            this.handleStartup();
        });

        // Handle messages from popup and content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });

        // Handle tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            this.handleTabUpdate(tabId, changeInfo, tab);
        });

        // Handle web navigation
        chrome.webNavigation?.onCompleted?.addListener((details) => {
            this.handleWebNavigation(details);
        });

        // Handle alarm events (for periodic tasks)
        chrome.alarms?.onAlarm?.addListener((alarm) => {
            this.handleAlarm(alarm);
        });
    }

    async handleInstallation(details) {
        console.log('PayMint extension installed:', details.reason);
        
        try {
            // Initialize default settings
            await this.initializeDefaultSettings();
            
            // Set up periodic tasks
            await this.setupPeriodicTasks();
            
            // Show welcome notification
            if (details.reason === 'install') {
                this.showNotification('Welcome to PayMint!', 'PayMint extension has been installed successfully.');
            } else if (details.reason === 'update') {
                this.showNotification('PayMint Updated', 'PayMint has been updated to the latest version.');
            }
            
        } catch (error) {
            console.error('Error during extension installation:', error);
        }
    }

    async handleStartup() {
        console.log('PayMint extension startup');
        
        try {
            // Restore extension state
            await this.restoreExtensionState();
            
            // Check for updates
            await this.checkForUpdates();
            
        } catch (error) {
            console.error('Error during extension startup:', error);
        }
    }

    async handleMessage(message, sender, sendResponse) {
        try {
            console.log('Received message:', message, 'from:', sender);
            
            switch (message.action) {
                case 'openPaymentInterface':
                    await this.openPaymentInterface(message.type);
                    sendResponse({ success: true });
                    break;
                    
                case 'openQRScanner':
                    await this.openQRScanner();
                    sendResponse({ success: true });
                    break;
                    
                case 'processPayment':
                    const result = await this.processPayment(message.paymentData);
                    sendResponse({ success: true, result });
                    break;
                    
                case 'getBalance':
                    const balance = await this.getBalance(message.currency);
                    sendResponse({ success: true, balance });
                    break;
                    
                case 'saveTransaction':
                    await this.saveTransaction(message.transaction);
                    sendResponse({ success: true });
                    break;
                    
                case 'detectPaymentForm':
                    const detected = await this.detectPaymentForm(sender.tab);
                    sendResponse({ success: true, detected });
                    break;
                    
                default:
                    console.warn('Unknown message action:', message.action);
                    sendResponse({ success: false, error: 'Unknown action' });
            }
            
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleTabUpdate(tabId, changeInfo, tab) {
        // Handle tab updates (e.g., URL changes, loading states)
        if (changeInfo.status === 'complete' && tab.url) {
            try {
                // Check if the page contains payment forms
                await this.analyzePageForPayments(tabId, tab.url);
                
            } catch (error) {
                console.error('Error analyzing page for payments:', error);
            }
        }
    }

    async handleWebNavigation(details) {
        // Handle web navigation completion
        if (details.frameId === 0) { // Main frame only
            try {
                // Inject content script if needed
                await this.injectContentScriptIfNeeded(details.tabId, details.url);
                
            } catch (error) {
                console.error('Error handling web navigation:', error);
            }
        }
    }

    async handleAlarm(alarm) {
        console.log('Alarm triggered:', alarm.name);
        
        switch (alarm.name) {
            case 'balanceUpdate':
                await this.updateBalances();
                break;
                
            case 'transactionSync':
                await this.syncTransactions();
                break;
                
            case 'securityCheck':
                await this.performSecurityCheck();
                break;
                
            default:
                console.warn('Unknown alarm:', alarm.name);
        }
    }

    async initializeDefaultSettings() {
        const defaultSettings = {
            preferredCurrency: 'USD',
            autoDetectPayments: true,
            securityLevel: 'high',
            notificationsEnabled: true,
            walletConnected: false,
            userBalance: 0,
            transactionHistory: [],
            supportedCurrencies: ['USD', 'EUR', 'BTC', 'ETH', 'USDC'],
            lastSyncTime: Date.now()
        };
        
        // Only set defaults if they don't exist
        const existingSettings = await chrome.storage.local.get(Object.keys(defaultSettings));
        const settingsToSet = {};
        
        for (const [key, value] of Object.entries(defaultSettings)) {
            if (!(key in existingSettings)) {
                settingsToSet[key] = value;
            }
        }
        
        if (Object.keys(settingsToSet).length > 0) {
            await chrome.storage.local.set(settingsToSet);
            console.log('Default settings initialized:', settingsToSet);
        }
    }

    async setupPeriodicTasks() {
        // Set up periodic alarms for background tasks
        chrome.alarms?.create('balanceUpdate', { delayInMinutes: 1, periodInMinutes: 5 });
        chrome.alarms?.create('transactionSync', { delayInMinutes: 2, periodInMinutes: 10 });
        chrome.alarms?.create('securityCheck', { delayInMinutes: 5, periodInMinutes: 60 });
    }

    async restoreExtensionState() {
        // Restore extension state from storage
        const state = await chrome.storage.local.get(['extensionState']);
        if (state.extensionState) {
            console.log('Extension state restored:', state.extensionState);
        }
    }

    async checkForUpdates() {
        // Check for extension updates
        try {
            const manifest = chrome.runtime.getManifest();
            console.log('Current version:', manifest.version);
            
            // Here you would typically check against a remote server
            // For now, just log the current version
            
        } catch (error) {
            console.error('Error checking for updates:', error);
        }
    }

    async openPaymentInterface(type) {
        try {
            // Create a new tab or window for payment interface
            const url = chrome.runtime.getURL(`payment.html?type=${type}`);
            
            await chrome.tabs.create({
                url: url,
                active: true
            });
            
        } catch (error) {
            console.error('Error opening payment interface:', error);
            throw error;
        }
    }

    async openQRScanner() {
        try {
            // Create a new tab for QR scanner
            const url = chrome.runtime.getURL('qr-scanner.html');
            
            await chrome.tabs.create({
                url: url,
                active: true
            });
            
        } catch (error) {
            console.error('Error opening QR scanner:', error);
            throw error;
        }
    }

    async processPayment(paymentData) {
        try {
            console.log('Processing payment:', paymentData);
            
            // Validate payment data
            if (!this.validatePaymentData(paymentData)) {
                throw new Error('Invalid payment data');
            }
            
            // Process the payment (this would involve actual payment processing)
            const result = await this.executePayment(paymentData);
            
            // Save transaction to history
            await this.saveTransaction({
                id: this.generateTransactionId(),
                ...paymentData,
                timestamp: Date.now(),
                status: result.success ? 'completed' : 'failed',
                result: result
            });
            
            return result;
            
        } catch (error) {
            console.error('Error processing payment:', error);
            throw error;
        }
    }

    async getBalance(currency = 'USD') {
        try {
            // Get balance from storage or API
            const result = await chrome.storage.local.get(['userBalance', 'balances']);
            
            if (currency === 'USD' || !currency) {
                return result.userBalance || 0;
            }
            
            return result.balances?.[currency] || 0;
            
        } catch (error) {
            console.error('Error getting balance:', error);
            return 0;
        }
    }

    async saveTransaction(transaction) {
        try {
            const result = await chrome.storage.local.get(['transactionHistory']);
            const history = result.transactionHistory || [];
            
            history.unshift(transaction); // Add to beginning
            
            // Keep only last 100 transactions
            if (history.length > 100) {
                history.length = 100;
            }
            
            await chrome.storage.local.set({ transactionHistory: history });
            
        } catch (error) {
            console.error('Error saving transaction:', error);
        }
    }

    async analyzePageForPayments(tabId, url) {
        try {
            // Skip non-http(s) URLs
            if (!url.startsWith('http')) return;
            
            // Check if auto-detection is enabled
            const settings = await chrome.storage.local.get(['autoDetectPayments']);
            if (!settings.autoDetectPayments) return;
            
            // Inject content script to analyze page
            await chrome.scripting.executeScript({
                target: { tabId },
                func: this.analyzePageContent
            });
            
        } catch (error) {
            console.error('Error analyzing page for payments:', error);
        }
    }

    analyzePageContent() {
        // This function runs in the page context
        const paymentIndicators = [
            'input[type="password"][name*="card"]',
            'input[name*="credit"]',
            'input[name*="payment"]',
            '.payment-form',
            '#payment',
            '[data-testid*="payment"]'
        ];
        
        const hasPaymentForm = paymentIndicators.some(selector => 
            document.querySelector(selector) !== null
        );
        
        if (hasPaymentForm) {
            console.log('Payment form detected on page');
            // Send message back to background
            chrome.runtime.sendMessage({
                action: 'paymentFormDetected',
                url: window.location.href
            });
        }
    }

    async injectContentScriptIfNeeded(tabId, url) {
        try {
            // Skip non-http(s) URLs
            if (!url.startsWith('http')) return;
            
            // Check if content script is already injected
            const results = await chrome.scripting.executeScript({
                target: { tabId },
                func: () => window.payMintInjected === true
            });
            
            if (!results[0]?.result) {
                // Inject content script
                await chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['content.js']
                });
            }
            
        } catch (error) {
            console.error('Error injecting content script:', error);
        }
    }

    async updateBalances() {
        try {
            // Update balances from API or blockchain
            console.log('Updating balances...');
            
            // This would typically fetch from external APIs
            // For now, just simulate an update
            
        } catch (error) {
            console.error('Error updating balances:', error);
        }
    }

    async syncTransactions() {
        try {
            // Sync transactions with external services
            console.log('Syncing transactions...');
            
            await chrome.storage.local.set({ lastSyncTime: Date.now() });
            
        } catch (error) {
            console.error('Error syncing transactions:', error);
        }
    }

    async performSecurityCheck() {
        try {
            // Perform security checks
            console.log('Performing security check...');
            
            // Check for suspicious activity, validate permissions, etc.
            
        } catch (error) {
            console.error('Error performing security check:', error);
        }
    }

    validatePaymentData(paymentData) {
        // Validate payment data structure and values
        return paymentData && 
               typeof paymentData.amount === 'number' && 
               paymentData.amount > 0 &&
               paymentData.currency &&
               paymentData.recipient;
    }

    async executePayment(paymentData) {
        // This would execute the actual payment
        // For now, return a mock result
        return {
            success: true,
            transactionId: this.generateTransactionId(),
            timestamp: Date.now()
        };
    }

    generateTransactionId() {
        return 'tx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    showNotification(title, message) {
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icons/icon48.png',
                title: title,
                message: message
            });
        }
    }
}

// Initialize background service worker
new PayMintBackground();