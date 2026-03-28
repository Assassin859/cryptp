# Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher) or **yarn**
- **Git**
- **MetaMask** browser extension (for testing)

## System Requirements

- OS: Windows, macOS, or Linux
- RAM: 2GB minimum (4GB recommended)
- Disk Space: 500MB for project and dependencies
- Browser: Modern browser with MetaMask support (Chrome, Firefox, Edge, Brave)

## Installation Steps

### 1. Verify Prerequisites

```bash
# Check Node.js version
node --version
# Output should be v18.0.0 or higher

# Check npm version
npm --version
# Output should be v9.0.0 or higher

# Check Git is installed
git --version
```

### 2. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/Assassin859/cryptp.git

# Navigate into the project directory
cd cryptp
```

### 3. Install Dependencies

```bash
# Install all required npm packages
npm install

# Verify installation was successful
npm list
```

### 4. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local if needed (no configuration required for local development)
# nano .env.local
```

### 5. Verify Installation

```bash
# Run linting to check for any issues
npm run lint

# Build the project
npm run build
```

## Starting Development Server

```bash
# Start the dev server
npm run dev

# The application will be available at:
# http://localhost:5173
```

## Troubleshooting

### Node/npm Issues

**Problem:** `node: command not found`

**Solution:**
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Ensure npm is also installed (comes with Node.js)
- Verify installation with `node --version`

**Problem:** npm packages fail to install

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install
```

### Port Already in Use

**Problem:** Port 5173 is already in use

**Solution:**
```bash
# Use a different port
npm run dev -- --port 3000

# Or kill the process using port 5173
# On macOS/Linux:
lsof -ti:5173 | xargs kill -9

# On Windows:
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### MetaMask Issues

**Problem:** MetaMask extension not found

**Solution:**
- Install MetaMask from [metamask.io](https://metamask.io/download/)
- Ensure it's enabled in your browser extensions
- Reload the page after installing

**Problem:** Can't connect to testnet

**Solution:**
- Verify your internet connection
- Check MetaMask is set to a testnet (Sepolia, Goerli)
- Try switching testnets in MetaMask settings

### Build Issues

**Problem:** `vite build` fails

**Solution:**
```bash
# Clear Vite cache
rm -rf dist .vite

# Rebuild
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

## Next Steps

1. Read the [DEPLOYMENT.md](DEPLOYMENT.md) guide to learn how to deploy a token
2. Check [CUSTOMIZATION.md](CUSTOMIZATION.md) to customize your token
3. Review [CONTRACTS.md](CONTRACTS.md) for smart contract details

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Review the main [README.md](../README.md)
3. Open an issue on [GitHub](https://github.com/Assassin859/cryptp/issues)
4. Check existing issues for similar problems
