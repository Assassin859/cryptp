# CryptP - ERC-20 Token Deployment Platform

> **A complete, user-friendly platform for deploying custom ERC-20 tokens on Ethereum with interactive guidance and smart contract templates.**

![React](https://img.shields.io/badge/React-18.3-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=flat-square&logo=typescript)
![Ethereum](https://img.shields.io/badge/Ethereum-Smart%20Contracts-663399?style=flat-square&logo=ethereum)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Development](#development)
- [Smart Contracts](#smart-contracts)
- [Deployment Guide](#deployment-guide)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

CryptP is a comprehensive solution for creating and deploying ERC-20 tokens on the Ethereum blockchain. It combines:

- **Interactive Web Interface** - Built with React & TypeScript
- **Production-Ready Smart Contracts** - Based on OpenZeppelin standards
- **Step-by-Step Deployment Guide** - Clear instructions for seamless deployment
- **MetaMask Integration** - Easy wallet connection & token testing

Whether you're a blockchain developer or someone exploring token creation, CryptP provides everything you need to launch your own token.

## ✨ Features

- 🚀 **User-Friendly Interface** - Beautiful, responsive design with Tailwind CSS
- 📝 **Interactive Deployment Guide** - Step-by-step instructions with visual icons
- 🔐 **Secure Smart Contracts** - OpenZeppelin-based ERC-20 implementation
- 💼 **MetaMask Ready** - Direct wallet integration for testing
- 🔗 **Standards Compliant** - Full ERC-20 token standard implementation
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🎨 **Dark Theme** - Modern, eye-friendly interface with gradients
- 📚 **Documentation** - Comprehensive guides and code comments

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- MetaMask browser extension (for testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/Assassin859/cryptp.git
cd cryptp

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 📁 Project Structure

```
cryptp/
├── src/                          # React application source
│   ├── components/               # Reusable React components
│   │   └── DeploymentGuide.tsx   # Main deployment guide component
│   ├── pages/                    # Page components
│   ├── styles/                   # Global styles
│   │   └── index.css             # Tailwind CSS imports
│   ├── types/                    # TypeScript type definitions
│   ├── utils/                    # Utility functions
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts             # Vite environment types
│
├── contracts/                    # Solidity smart contracts
│   ├── MyToken.sol               # Main token implementation
│   ├── ERC20.sol                 # ERC-20 standard implementation
│   ├── IERC20.sol                # ERC-20 interface
│   ├── Extensions/
│   │   └── IERC20Metadata.sol    # Token metadata interface
│   └── utils/
│       └── Context.sol           # Context utility for msg.sender
│
├── docs/                         # Documentation
│   ├── INSTALLATION.md           # Detailed installation guide
│   ├── DEPLOYMENT.md             # Deployment tutorial
│   ├── CONTRACTS.md              # Smart contract documentation
│   └── CUSTOMIZATION.md          # Guide for customizing tokens
│
├── public/                       # Static assets
├── dist/                         # Build output
│
├── package.json                  # Project dependencies
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
├── postcss.config.js             # PostCSS configuration
├── eslint.config.js              # ESLint configuration
│
├── index.html                    # HTML entry point
├── README.md                     # This file
├── CONTRIBUTING.md               # Contributing guidelines
├── LICENSE                       # MIT License
└── .env.example                  # Environment variables template
```

## 💻 Installation

### Prerequisites Check

```bash
# Verify Node.js version
node --version  # Should be v18.0.0 or higher
npm --version   # Should be v9.0.0 or higher
```

### Setup Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Assassin859/cryptp.git
   cd cryptp
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create Environment File**
   ```bash
   cp .env.example .env.local
   ```

4. **Verify Installation**
   ```bash
   npm run lint  # Check code quality
   ```

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint

# Format code (if configured)
npm run format
```

### Development Workflow

1. **Start dev server**: `npm run dev`
2. **Edit components** in `src/components/`
3. **Changes auto-reload** in the browser
4. **Run linting** before committing: `npm run lint`

### Technology Stack

- **Frontend Framework**: React 18.3
- **Language**: TypeScript 5.5
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Blockchain**: Ethereum, Solidity 0.8.20

## 🔐 Smart Contracts

### Contract Overview

The project includes a complete, production-ready ERC-20 token implementation based on OpenZeppelin standards.

### MyToken Contract

```solidity
contract MyToken is ERC20 {
    constructor() ERC20("MyTokenName", "MTK") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }
}
```

**Key Features:**
- Initial supply: 1,000,000 tokens
- Decimals: 18 (standard for ERC-20)
- Full ERC-20 compliance
- Token metadata support (name, symbol, decimals)

### Contract Files

| File | Purpose |
|------|---------|
| `MyToken.sol` | Main token contract - deploy this one |
| `ERC20.sol` | ERC-20 standard implementation |
| `IERC20.sol` | ERC-20 interface definition |
| `IERC20Metadata.sol` | Token metadata interface |
| `Context.sol` | Utility for accessing msg.sender |

## 📚 Deployment Guide

### Overview

CryptP provides an interactive, step-by-step guide within the web interface. Here's the quick version:

### Quick Deployment Steps

1. **Remix Setup**
   - Go to [Remix IDE](https://remix.ethereum.org)
   - Create new workspace
   - Add all `.sol` files from `contracts/` folder

2. **Compile Contract**
   - Select Solidity Compiler tab
   - Choose compiler version 0.8.20+
   - Compile MyToken.sol

3. **Setup MetaMask**
   - Install [MetaMask](https://metamask.io/download/)
   - Connect to testnet (Sepolia/Goerli)
   - Get testnet ETH from faucet

4. **Deploy**
   - Go to Deploy & Run Transactions
   - Set environment to "Injected Provider - MetaMask"
   - Deploy MyToken contract
   - Confirm in MetaMask

5. **Add to Wallet**
   - Copy deployed contract address
   - Import in MetaMask
   - View your tokens

### For Detailed Instructions

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for comprehensive step-by-step guide with screenshots.

## 📖 Documentation

- [Installation Guide](docs/INSTALLATION.md) - Detailed setup instructions
- [Deployment Tutorial](docs/DEPLOYMENT.md) - Complete deployment walkthrough
- [Smart Contracts](docs/CONTRACTS.md) - Contract documentation
- [Customization Guide](docs/CUSTOMIZATION.md) - How to customize your token

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Areas for Contribution

- 🐛 Bug fixes and improvements
- 📚 Documentation enhancements
- 🎨 UI/UX improvements
- ✨ New features (contract templates, advanced features, etc.)
- 🧪 Tests and test coverage

## 🔧 Customization

### Changing Token Parameters

To create your own token with custom name and supply:

1. Edit `contracts/MyToken.sol`:
```solidity
constructor() ERC20("Your Token Name", "YTK") {
    _mint(msg.sender, YOUR_SUPPLY * 10 ** decimals());
}
```

2. Recompile and deploy in Remix IDE

See [CUSTOMIZATION.md](docs/CUSTOMIZATION.md) for detailed customization options.

## 📋 License

This project is licensed under the **MIT License** - see [LICENSE](LICENSE) file for details.

The smart contracts are based on OpenZeppelin's ERC-20 implementation, also under MIT license.

## 🔗 Useful Resources

- [Ethereum Documentation](https://ethereum.org/en/developers/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Remix IDE Guide](https://remix-ide.readthedocs.io/)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Solidity Documentation](https://docs.soliditylang.org/)

## ⚠️ Disclaimer

- This is educational software. Use at your own risk.
- Always test on testnets before deploying to mainnet
- Never share your private keys or seed phrases
- Be aware of gas costs when deploying on mainnet

## 🙋 Support & Questions

- 📧 Open an issue on GitHub for bug reports
- 💬 Discussions for general questions
- 📚 Check existing documentation first

## 🎯 Roadmap

- [ ] Multi-chain deployment support (Polygon, BSC, Arbitrum)
- [ ] Advanced token features (pausable, burnable, capped supply)
- [ ] Direct deployment from UI (without Remix)
- [ ] Token analytics dashboard
- [ ] Governance token templates
- [ ] NFT contract templates
- [ ] Community examples

---

**Made with ❤️ by the CryptP team**

*Last updated: March 2026*
