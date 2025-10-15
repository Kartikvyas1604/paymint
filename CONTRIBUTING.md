# Contributing to PayMint Browser Extension

Thank you for your interest in contributing to PayMint! This document provides guidelines and instructions for contributing to the project.

## 🤝 How to Contribute

### Reporting Bugs

1. **Check existing issues** first to avoid duplicates
2. **Use the bug report template** when creating new issues
3. **Provide detailed information** including:
   - Browser and version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

### Suggesting Features

1. **Check roadmap and existing feature requests**
2. **Use the feature request template**
3. **Explain the use case** and benefit to users
4. **Consider implementation complexity**

### Code Contributions

#### Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/your-username/paymint-extension.git
   cd paymint-extension
   ```

2. **Install development dependencies** (optional)
   ```bash
   npm install
   ```

3. **Load extension in browser**
   - Chrome: Go to `chrome://extensions/`, enable Developer mode, click "Load unpacked"
   - Firefox: Go to `about:debugging`, click "This Firefox", click "Load Temporary Add-on"

#### Coding Standards

- **JavaScript Style**: Use ES2020+ features, prefer `const` over `let`
- **Naming**: Use camelCase for variables and functions, PascalCase for classes
- **Comments**: Document complex logic and public APIs
- **Error Handling**: Always handle errors gracefully with try-catch blocks
- **Security**: Never log sensitive data, validate all inputs

#### Code Structure

```
paymint/
├── manifest.json     # Extension configuration
├── popup/            # Popup interface files
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── background/       # Background script
│   └── background.js
├── content/          # Content scripts
│   └── content.js
├── assets/           # Static assets
│   └── icons/
└── docs/            # Documentation
```

#### Commit Guidelines

Follow [Conventional Commits](https://conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

Examples:
```
feat: add QR code scanner for payment addresses
fix: resolve popup not opening in Firefox
docs: update installation instructions
```

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow coding standards
   - Add tests if applicable
   - Update documentation

3. **Test thoroughly**
   - Test in multiple browsers (Chrome, Firefox, Safari, Edge)
   - Test both popup and content script functionality
   - Verify extension permissions work correctly

4. **Submit pull request**
   - Use descriptive title and description
   - Reference related issues
   - Include screenshots for UI changes

## 🧪 Testing

### Manual Testing

1. **Load extension in developer mode**
2. **Test popup functionality**
   - Click extension icon
   - Try all buttons and features
   - Check for console errors

3. **Test content script**
   - Visit e-commerce websites
   - Verify payment form detection
   - Test PayMint button injection

4. **Test background script**
   - Check extension startup
   - Verify message passing
   - Test periodic tasks

### Browser Compatibility

Test on these browsers:
- **Chrome 88+**
- **Firefox 78+**
- **Safari 14+** (if on macOS)
- **Edge 88+**

### Performance Testing

- **Memory usage**: Check for memory leaks
- **CPU usage**: Ensure background script is efficient
- **Startup time**: Extension should load quickly

## 🐛 Debugging

### Chrome DevTools

1. **Popup debugging**:
   - Right-click extension icon → "Inspect popup"

2. **Background script debugging**:
   - Go to `chrome://extensions/`
   - Click "background page" link under extension

3. **Content script debugging**:
   - Open DevTools on target webpage
   - Content script runs in page context

### Firefox Debugging

1. **about:debugging**
   - Click "This Firefox"
   - Click "Inspect" next to extension

2. **Browser Console**
   - Press Ctrl+Shift+J (or Cmd+Shift+J on Mac)

## 🔒 Security Guidelines

### Data Handling

- **Never log sensitive data** (passwords, keys, personal info)
- **Encrypt stored data** using Web Crypto API
- **Validate all inputs** from web pages and user input
- **Use HTTPS** for all external API calls

### Permissions

- **Minimal permissions**: Only request what's needed
- **Document permission usage** in code comments
- **Regular permission audit** to remove unused permissions

### Content Security Policy

- **No inline scripts**: Use external JS files only
- **No eval()**: Never use eval() or similar functions
- **Sanitize HTML**: Always sanitize user-generated content

## 📝 Documentation

### Code Documentation

```javascript
/**
 * Processes a payment transaction
 * @param {Object} paymentData - Payment details
 * @param {number} paymentData.amount - Payment amount
 * @param {string} paymentData.currency - Currency code
 * @param {string} paymentData.recipient - Recipient address/email
 * @returns {Promise<Object>} Transaction result
 */
async function processPayment(paymentData) {
  // Implementation
}
```

### README Updates

- **Keep README current** with new features
- **Update installation instructions** if process changes
- **Add screenshots** for UI features
- **Document configuration options**

## 🚀 Release Process

### Version Numbering

Use [Semantic Versioning](https://semver.org/):
- **Major**: Breaking changes (2.0.0)
- **Minor**: New features (1.1.0)
- **Patch**: Bug fixes (1.0.1)

### Release Checklist

- [ ] Update version in `manifest.json`
- [ ] Update version in `package.json`
- [ ] Update CHANGELOG.md
- [ ] Test in all supported browsers
- [ ] Create release notes
- [ ] Tag release in Git

## 💬 Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat (coming soon)
- **Email**: security@paymint.dev (security issues only)

### Code Review Process

1. **All changes require review** by maintainers
2. **Reviews focus on**:
   - Code quality and standards
   - Security implications
   - Browser compatibility
   - Performance impact

3. **Review criteria**:
   - ✅ Follows coding standards
   - ✅ Includes tests (if applicable)
   - ✅ Updates documentation
   - ✅ No security vulnerabilities

## 🎯 Development Roadmap

### Current Priorities

- [ ] Enhanced security features
- [ ] Additional cryptocurrency support
- [ ] Mobile browser compatibility
- [ ] Performance optimizations

### Future Features

- [ ] Multi-signature wallet support
- [ ] Hardware wallet integration
- [ ] Advanced transaction analytics
- [ ] Merchant integration APIs

## 📞 Getting Help

If you need help:

1. **Check the documentation** first
2. **Search existing issues** for similar problems
3. **Ask in GitHub Discussions** for general questions
4. **Create an issue** for bugs or specific problems

Thank you for contributing to PayMint! 🙏