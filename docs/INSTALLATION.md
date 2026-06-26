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

CryptP requires a Supabase project for authentication and cloud workspaces.

1. Create a project at [supabase.com](https://supabase.com).
2. In the dashboard: **Settings → API**, copy the **Project URL** and **anon public** key.
3. Copy the example env file and add your keys:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Optional: `VITE_RPC_URL`, `VITE_ETHERSCAN_API_KEY`, and other variables in `.env.example`.

**Session behavior:** Each new browser tab starts signed out (zombie-session protection). After 15 minutes of inactivity you are signed out automatically. API keys stored in Settings remain in scoped browser localStorage across logout.

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

## GitHub sync (optional)

1. In Supabase: **Authentication → Providers → GitHub** — enable the provider.
2. Sign in to CryptP with GitHub so `provider_token` is available for API calls.
3. If sync fails, log out and sign in again to refresh the token.

## Security notes

- API keys entered in Settings are stored in browser `localStorage` and may sync to Supabase `user_settings`. Never commit `.env.local`.
- The built-in security scanner uses static heuristics only; use professional tools (Slither, etc.) before mainnet deployment.

## Troubleshooting

### Compiler fails to load

The in-browser compiler downloads WASM from `https://binaries.soliditylang.org`. Corporate firewalls or offline environments may block this URL.

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
