// PayMint Content Script
class PayMintContent {
    constructor() {
        this.init();
    }

    init() {
        // Mark as injected to prevent multiple injections
        if (window.payMintInjected) {
            return;
        }
        window.payMintInjected = true;

        this.setupEventListeners();
        this.observePageChanges();
        this.scanForPaymentForms();
        this.injectPayMintUI();
        
        console.log('PayMint content script initialized on:', window.location.href);
    }

    setupEventListeners() {
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true;
        });

        // Listen for page events
        document.addEventListener('DOMContentLoaded', () => {
            this.onDOMContentLoaded();
        });

        // Listen for form submissions
        document.addEventListener('submit', (event) => {
            this.onFormSubmit(event);
        });

        // Listen for input changes on payment fields
        document.addEventListener('input', (event) => {
            this.onInputChange(event);
        });

        // Listen for PayMint custom events
        document.addEventListener('paymint:processPayment', (event) => {
            this.processPaymentEvent(event);
        });
    }

    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'scanPaymentForms':
                const forms = this.scanForPaymentForms();
                sendResponse({ success: true, forms });
                break;
                
            case 'fillPaymentForm':
                this.fillPaymentForm(message.formData);
                sendResponse({ success: true });
                break;
                
            case 'highlightPaymentFields':
                this.highlightPaymentFields(message.highlight);
                sendResponse({ success: true });
                break;
                
            case 'injectPayMintButton':
                this.injectPayMintButton(message.target);
                sendResponse({ success: true });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }

    observePageChanges() {
        // Observe DOM changes for dynamically loaded content
        const observer = new MutationObserver((mutations) => {
            let shouldRescan = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Check if any added nodes contain payment-related elements
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (this.containsPaymentElements(node)) {
                                shouldRescan = true;
                                break;
                            }
                        }
                    }
                }
            });
            
            if (shouldRescan) {
                setTimeout(() => this.scanForPaymentForms(), 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.mutationObserver = observer;
    }

    scanForPaymentForms() {
        const paymentForms = [];
        
        // Selectors for common payment form patterns
        const paymentSelectors = [
            // Credit card forms
            'form:has(input[name*="card"])',
            'form:has(input[name*="credit"])',
            'form:has(input[placeholder*="card"])',
            
            // Payment forms
            'form.payment-form',
            'form#payment',
            'form[action*="payment"]',
            'form[action*="checkout"]',
            
            // PayPal and other payment processors
            'form[action*="paypal"]',
            'form[action*="stripe"]',
            'form[action*="square"]',
            
            // Generic checkout forms
            '.checkout-form',
            '.payment-container',
            '[data-testid*="payment"]'
        ];
        
        // Find all potential payment forms
        const forms = document.querySelectorAll('form');
        
        forms.forEach((form, index) => {
            const paymentData = this.analyzeForm(form);
            if (paymentData.isPaymentForm) {
                paymentForms.push({
                    index,
                    element: form,
                    ...paymentData
                });
                
                // Inject PayMint button into the form
                this.injectPayMintButton(form);
            }
        });
        
        // Also check for payment-related inputs outside of forms
        this.scanForStandalonePaymentInputs();
        
        if (paymentForms.length > 0) {
            console.log('Payment forms detected:', paymentForms.length);
            
            // Notify background script
            chrome.runtime.sendMessage({
                action: 'paymentFormsDetected',
                count: paymentForms.length,
                url: window.location.href
            });
        }
        
        return paymentForms;
    }

    analyzeForm(form) {
        const inputs = form.querySelectorAll('input, select');
        const formData = {
            isPaymentForm: false,
            hasCardNumber: false,
            hasExpiryDate: false,
            hasCVV: false,
            hasPaymentAmount: false,
            paymentMethod: null,
            fields: []
        };
        
        inputs.forEach(input => {
            const name = (input.name || '').toLowerCase();
            const placeholder = (input.placeholder || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            const type = input.type || '';
            
            // Check for credit card number
            if (this.isCardNumberField(name, placeholder, id)) {
                formData.hasCardNumber = true;
                formData.isPaymentForm = true;
                formData.fields.push({ type: 'cardNumber', element: input });
            }
            
            // Check for expiry date
            else if (this.isExpiryField(name, placeholder, id)) {
                formData.hasExpiryDate = true;
                formData.isPaymentForm = true;
                formData.fields.push({ type: 'expiry', element: input });
            }
            
            // Check for CVV
            else if (this.isCVVField(name, placeholder, id)) {
                formData.hasCVV = true;
                formData.isPaymentForm = true;
                formData.fields.push({ type: 'cvv', element: input });
            }
            
            // Check for payment amount
            else if (this.isAmountField(name, placeholder, id, type)) {
                formData.hasPaymentAmount = true;
                formData.isPaymentForm = true;
                formData.fields.push({ type: 'amount', element: input });
            }
        });
        
        // Check for payment processor indicators
        const formHTML = form.innerHTML.toLowerCase();
        if (formHTML.includes('paypal')) formData.paymentMethod = 'paypal';
        else if (formHTML.includes('stripe')) formData.paymentMethod = 'stripe';
        else if (formHTML.includes('apple pay')) formData.paymentMethod = 'applepay';
        else if (formHTML.includes('google pay')) formData.paymentMethod = 'googlepay';
        
        return formData;
    }

    isCardNumberField(name, placeholder, id) {
        const cardPatterns = [
            'card', 'cardnumber', 'card_number', 'creditcard', 'credit_card',
            'ccnumber', 'cc_number', 'number', 'pan'
        ];
        return cardPatterns.some(pattern => 
            name.includes(pattern) || placeholder.includes(pattern) || id.includes(pattern)
        );
    }

    isExpiryField(name, placeholder, id) {
        const expiryPatterns = [
            'expiry', 'expire', 'exp', 'expiration', 'valid', 'month', 'year',
            'mm', 'yy', 'yyyy'
        ];
        return expiryPatterns.some(pattern => 
            name.includes(pattern) || placeholder.includes(pattern) || id.includes(pattern)
        );
    }

    isCVVField(name, placeholder, id) {
        const cvvPatterns = ['cvv', 'cvc', 'security', 'cid', 'csv'];
        return cvvPatterns.some(pattern => 
            name.includes(pattern) || placeholder.includes(pattern) || id.includes(pattern)
        );
    }

    isAmountField(name, placeholder, id, type) {
        const amountPatterns = ['amount', 'price', 'total', 'cost', 'payment', 'sum'];
        const isNumberInput = type === 'number' || type === 'tel';
        
        return isNumberInput && amountPatterns.some(pattern => 
            name.includes(pattern) || placeholder.includes(pattern) || id.includes(pattern)
        );
    }

    containsPaymentElements(element) {
        const paymentKeywords = [
            'payment', 'card', 'credit', 'checkout', 'billing',
            'paypal', 'stripe', 'pay', 'purchase'
        ];
        
        const textContent = element.textContent?.toLowerCase() || '';
        const innerHTML = element.innerHTML?.toLowerCase() || '';
        
        return paymentKeywords.some(keyword => 
            textContent.includes(keyword) || innerHTML.includes(keyword)
        );
    }

    scanForStandalonePaymentInputs() {
        // Check for payment inputs that might not be in forms
        const inputs = document.querySelectorAll('input[type="text"], input[type="tel"], input[type="number"]');
        
        inputs.forEach(input => {
            if (!input.closest('form')) {
                const name = (input.name || '').toLowerCase();
                const placeholder = (input.placeholder || '').toLowerCase();
                const id = (input.id || '').toLowerCase();
                
                if (this.isCardNumberField(name, placeholder, id) ||
                    this.isExpiryField(name, placeholder, id) ||
                    this.isCVVField(name, placeholder, id)) {
                    
                    this.highlightPaymentField(input);
                }
            }
        });
    }

    injectPayMintButton(form) {
        // Check if button already exists
        if (form.querySelector('.paymint-button')) {
            return;
        }
        
        // Create PayMint button
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'paymint-button';
        button.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            Pay with PayMint
        `;
        
        // Style the button
        Object.assign(button.style, {
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            margin: '8px 0',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
            zIndex: '9999',
            position: 'relative'
        });
        
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = '0 2px 8px rgba(79, 70, 229, 0.3)';
        });
        
        // Add click handler
        button.addEventListener('click', (event) => {
            event.preventDefault();
            this.handlePayMintButtonClick(form);
        });
        
        // Find the best place to insert the button
        const submitButton = form.querySelector('input[type="submit"], button[type="submit"], .submit-button');
        if (submitButton) {
            submitButton.parentNode.insertBefore(button, submitButton);
        } else {
            form.appendChild(button);
        }
    }

    async handlePayMintButtonClick(form) {
        try {
            console.log('PayMint button clicked');
            
            // Gather form data
            const formData = this.gatherFormData(form);
            
            // Show PayMint payment interface
            const result = await chrome.runtime.sendMessage({
                action: 'openPaymentInterface',
                type: 'send',
                formData: formData,
                url: window.location.href
            });
            
            if (result.success) {
                this.showPayMintNotification('Payment interface opened', 'success');
            }
            
        } catch (error) {
            console.error('Error handling PayMint button click:', error);
            this.showPayMintNotification('Error opening payment interface', 'error');
        }
    }

    gatherFormData(form) {
        const formData = {};
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name && input.value) {
                formData[input.name] = input.value;
            }
        });
        
        return formData;
    }

    fillPaymentForm(data) {
        // Fill payment form with data from PayMint
        Object.entries(data).forEach(([fieldName, value]) => {
            const field = document.querySelector(`input[name="${fieldName}"], select[name="${fieldName}"]`);
            if (field) {
                field.value = value;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    highlightPaymentFields(highlight = true) {
        const paymentInputs = document.querySelectorAll(
            'input[name*="card"], input[name*="credit"], input[name*="cvv"], input[name*="expiry"]'
        );
        
        paymentInputs.forEach(input => {
            this.highlightPaymentField(input, highlight);
        });
    }

    highlightPaymentField(input, highlight = true) {
        if (highlight) {
            input.style.outline = '2px solid #4f46e5';
            input.style.outlineOffset = '2px';
            input.style.boxShadow = '0 0 0 4px rgba(79, 70, 229, 0.1)';
        } else {
            input.style.outline = '';
            input.style.outlineOffset = '';
            input.style.boxShadow = '';
        }
    }

    injectPayMintUI() {
        // Create PayMint floating action button
        if (document.querySelector('#paymint-fab')) return;
        
        const fab = document.createElement('div');
        fab.id = 'paymint-fab';
        fab.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        `;
        
        Object.assign(fab.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '56px',
            height: '56px',
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            color: 'white',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(79, 70, 229, 0.3)',
            zIndex: '10000',
            transition: 'all 0.3s ease',
            opacity: '0.9'
        });
        
        fab.addEventListener('mouseenter', () => {
            fab.style.transform = 'scale(1.1)';
            fab.style.opacity = '1';
        });
        
        fab.addEventListener('mouseleave', () => {
            fab.style.transform = 'scale(1)';
            fab.style.opacity = '0.9';
        });
        
        fab.addEventListener('click', () => {
            this.togglePayMintPanel();
        });
        
        document.body.appendChild(fab);
    }

    togglePayMintPanel() {
        let panel = document.querySelector('#paymint-panel');
        
        if (panel) {
            panel.remove();
            return;
        }
        
        // Create PayMint panel
        panel = document.createElement('div');
        panel.id = 'paymint-panel';
        panel.innerHTML = `
            <div class="paymint-panel-header">
                <h3>PayMint</h3>
                <button class="close-btn">&times;</button>
            </div>
            <div class="paymint-panel-content">
                <button class="paymint-action-btn" data-action="scan-forms">
                    📋 Scan Payment Forms
                </button>
                <button class="paymint-action-btn" data-action="fill-form">
                    ✏️ Auto-Fill Payment
                </button>
                <button class="paymint-action-btn" data-action="quick-pay">
                    💳 Quick Pay
                </button>
                <button class="paymint-action-btn" data-action="settings">
                    ⚙️ Settings
                </button>
            </div>
        `;
        
        // Style the panel
        Object.assign(panel.style, {
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '280px',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: '10001',
            animation: 'slideUp 0.3s ease-out',
            border: '1px solid #e2e8f0'
        });
        
        // Add panel styles to head
        this.addPayMintStyles();
        
        // Add event listeners
        panel.querySelector('.close-btn').addEventListener('click', () => {
            panel.remove();
        });
        
        panel.querySelectorAll('.paymint-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handlePanelAction(e.target.dataset.action);
            });
        });
        
        document.body.appendChild(panel);
    }

    addPayMintStyles() {
        if (document.querySelector('#paymint-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'paymint-styles';
        style.textContent = `
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            #paymint-panel .paymint-panel-header {
                padding: 16px 20px 12px;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            #paymint-panel .paymint-panel-header h3 {
                margin: 0;
                color: #1e293b;
                font-size: 18px;
                font-weight: 600;
            }
            
            #paymint-panel .close-btn {
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #64748b;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            #paymint-panel .paymint-panel-content {
                padding: 16px 20px 20px;
            }
            
            #paymint-panel .paymint-action-btn {
                width: 100%;
                padding: 12px 16px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                margin-bottom: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                color: #374151;
                display: flex;
                align-items: center;
                gap: 8px;
                transition: all 0.2s ease;
            }
            
            #paymint-panel .paymint-action-btn:hover {
                background: #f1f5f9;
                border-color: #cbd5e1;
                transform: translateY(-1px);
            }
            
            #paymint-panel .paymint-action-btn:last-child {
                margin-bottom: 0;
            }
        `;
        
        document.head.appendChild(style);
    }

    handlePanelAction(action) {
        switch (action) {
            case 'scan-forms':
                this.scanForPaymentForms();
                this.showPayMintNotification('Payment forms scanned', 'success');
                break;
                
            case 'fill-form':
                chrome.runtime.sendMessage({ action: 'openPaymentInterface', type: 'autofill' });
                break;
                
            case 'quick-pay':
                chrome.runtime.sendMessage({ action: 'openPaymentInterface', type: 'quick' });
                break;
                
            case 'settings':
                chrome.runtime.sendMessage({ action: 'openSettings' });
                break;
        }
        
        // Close panel
        document.querySelector('#paymint-panel')?.remove();
    }

    showPayMintNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `paymint-notification ${type}`;
        notification.textContent = message;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 16px',
            background: type === 'error' ? '#ef4444' : '#22c55e',
            color: 'white',
            borderRadius: '8px',
            zIndex: '10002',
            fontWeight: '500',
            fontSize: '14px',
            animation: 'slideIn 0.3s ease-out'
        });
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    onDOMContentLoaded() {
        console.log('DOM content loaded, rescanning for payment forms');
        setTimeout(() => this.scanForPaymentForms(), 500);
    }

    onFormSubmit(event) {
        const form = event.target;
        const paymentData = this.analyzeForm(form);
        
        if (paymentData.isPaymentForm) {
            console.log('Payment form submission detected');
            
            // Optionally intercept and process with PayMint
            // event.preventDefault();
        }
    }

    onInputChange(event) {
        const input = event.target;
        
        // Check if it's a payment-related input
        const name = (input.name || '').toLowerCase();
        const placeholder = (input.placeholder || '').toLowerCase();
        const id = (input.id || '').toLowerCase();
        
        if (this.isCardNumberField(name, placeholder, id)) {
            // Format card number as user types
            this.formatCardNumber(input);
        }
    }

    formatCardNumber(input) {
        let value = input.value.replace(/\s/g, '');
        let formattedValue = value.replace(/(.{4})/g, '$1 ').trim();
        
        if (formattedValue !== input.value) {
            input.value = formattedValue;
        }
    }

    processPaymentEvent(event) {
        // Handle custom PayMint payment events
        console.log('Processing PayMint payment event:', event.detail);
    }

    // Cleanup method
    destroy() {
        if (this.mutationObserver) {
            this.mutationObserver.disconnect();
        }
        
        document.querySelector('#paymint-fab')?.remove();
        document.querySelector('#paymint-panel')?.remove();
        document.querySelector('#paymint-styles')?.remove();
    }
}

// Initialize content script
const payMintContent = new PayMintContent();