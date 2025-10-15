# PayMint Browser Extension

PayMint is a secure browser extension for processing cryptocurrency and traditional payments directly from your browser. It provides seamless payment integration, auto-detection of payment forms, and secure transaction processing.

## 🚀 Features

- **Universal Browser Support**: Works on Chrome, Firefox, Safari, and Edge
- **Payment Form Detection**: Automatically detects and highlights payment forms on websites
- **Secure Payment Processing**: End-to-end encrypted payment transactions
- **Multi-Currency Support**: Supports USD, EUR, BTC, ETH, USDC, and more
- **Quick Pay**: One-click payment processing for supported merchants
- **QR Code Scanner**: Built-in QR code scanner for payment addresses
- **Transaction History**: Complete transaction tracking and history
- **Auto-Fill**: Smart form auto-filling for faster checkouts

## 📦 Installation

### From Source (Development)

1. Clone or download this repository
2. Open your browser's extension management page:
   - **Chrome**: `chrome://extensions/`
   - **Firefox**: `about:addons`
   - **Edge**: `edge://extensions/`
3. Enable "Developer mode" (Chrome/Edge) or "Debug add-ons" (Firefox)
4. Click "Load unpacked" and select the `paymint` folder

### From Extension Store (Coming Soon)

PayMint will be available on:
- Chrome Web Store
- Firefox Add-ons
- Edge Add-ons
- Safari Extensions Gallery

## 🛠️ Development Setup

### Prerequisites

- Node.js 16+ (optional, for development tools)
- Modern web browser with extension development support
- Text editor or IDE

### Project Structure

```
paymint/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html            # Extension popup interface
├── popup.css             # Popup styling
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── content.js            # Content script for web page injection
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── icon-generator.html   # Tool for generating icons
└── README.md            # This file
```

### Building and Testing

1. **Load Extension**: Load the extension in developer mode
2. **Test Popup**: Click the extension icon to test the popup interface
3. **Test Content Script**: Visit any e-commerce site to see payment form detection
4. **Debug Background**: Use browser dev tools to debug the background script

### Key Files Explained

- **`manifest.json`**: Defines extension permissions, scripts, and metadata
- **`popup.js`**: Handles popup interface interactions and wallet operations
- **`background.js`**: Manages background processes, API calls, and message handling
- **`content.js`**: Injects PayMint functionality into web pages and detects payment forms

## 🔧 Configuration

### Default Settings

```javascript
{
  "preferredCurrency": "USD",
  "autoDetectPayments": true,
  "securityLevel": "high",
  "notificationsEnabled": true
}
```

### Supported Currencies

- **Fiat**: USD, EUR, GBP, JPY, CAD, AUD
- **Crypto**: BTC, ETH, USDC, USDT, ADA, SOL

## 🔐 Security

PayMint implements multiple layers of security:

- **Local Storage Encryption**: All sensitive data is encrypted before storage
- **Secure Communication**: All API communications use TLS 1.3+
- **Permission Minimization**: Only requests necessary browser permissions
- **Content Security Policy**: Strict CSP to prevent XSS attacks
- **Input Validation**: All user inputs are validated and sanitized

## 📱 Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 88+ | ✅ Full Support |
| Firefox | 78+ | ✅ Full Support |
| Safari | 14+ | ✅ Full Support |
| Edge | 88+ | ✅ Full Support |
| Opera | 74+ | ✅ Full Support |

## 🛡️ Permissions

PayMint requests the following permissions:

- **`activeTab`**: Access current tab to detect payment forms
- **`storage`**: Store user preferences and transaction history
- **`scripting`**: Inject content scripts for payment form detection
- **`notifications`**: Show payment confirmations and alerts
- **`<all_urls>`**: Access websites to provide payment functionality

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly in multiple browsers
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📊 API Reference

### Content Script Events

```javascript
// Listen for PayMint payment events
document.addEventListener('paymint:processPayment', (event) => {
  console.log('Payment initiated:', event.detail);
});

// Trigger payment from web page
document.dispatchEvent(new CustomEvent('paymint:pay', {
  detail: {
    amount: 100.00,
    currency: 'USD',
    recipient: 'merchant@example.com'
  }
}));
```

### Background Script Messages

```javascript
// Send payment request
chrome.runtime.sendMessage({
  action: 'processPayment',
  paymentData: {
    amount: 50.00,
    currency: 'USD',
    recipient: 'wallet-address-or-email'
  }
});

// Get balance
chrome.runtime.sendMessage({
  action: 'getBalance',
  currency: 'BTC'
}, (response) => {
  console.log('Balance:', response.balance);
});
```

## 🔄 Changelog

### Version 1.0.0 (Current)

- Initial release
- Payment form detection
- Multi-currency support
- Secure transaction processing
- Cross-browser compatibility

## 🚨 Known Issues

- Safari extension API limitations may affect some features
- Firefox mobile support is limited
- Some payment processors may block extension interactions

## 📞 Support

- **Documentation**: [https://paymint.dev/docs](https://paymint.dev/docs)
- **Issues**: [GitHub Issues](https://github.com/paymint/extension/issues)
- **Email**: support@paymint.dev
- **Discord**: [PayMint Community](https://discord.gg/paymint)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Icons by [Heroicons](https://heroicons.com/)
- UI components inspired by [Tailwind UI](https://tailwindui.com/)
- Cryptographic libraries by [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)

---

**⚠️ Disclaimer**: PayMint is currently in beta. Use at your own risk and never share private keys or sensitive information. Always verify transactions before confirming.