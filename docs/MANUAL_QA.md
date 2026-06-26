# 📋 CryptP Manual QA Guide (Out-of-Scope Automation Gaps)

This document provides step-by-step instructions for manually verifying the features of the CryptP IDE that cannot be automatically tested in a headless CI environment due to third-party integrations (MetaMask, GitHub OAuth, real AI API keys) or browser file dialog constraints.

---

## 🦊 1. MetaMask Wallet Flow (Checklist I1–I4)

Since headless Playwright Chrome instances do not have the MetaMask extension installed or a pre-configured wallet, these steps must be verified by a human tester using a browser with MetaMask installed.

### I1: MetaMask Connect
1. Click the **Wallet Connect** button (usually located in the bottom bar or Settings).
2. Verify the MetaMask browser extension pops up and requests connection permission.
3. Approve the connection.
4. Verify your wallet address (e.g., `0x...`) is displayed correctly in the CryptP interface.

### I2: Network Switch
1. Change the network dropdown in MetaMask (e.g., from Ethereum Mainnet to Sepolia Testnet or Localhost).
2. Verify that the network status indicator in the CryptP IDE updates dynamically to match the newly selected network.

### I3: MetaMask Deploy
1. Compile a valid contract (e.g., `SmokeStorage.sol`).
2. Switch the target network in CryptP to **Sepolia** or another live testnet.
3. Click **Deploy via MetaMask**.
4. Verify the MetaMask popup asks to confirm the transaction with gas estimation.
5. Confirm the transaction.
6. Verify the transaction status updates to "Success" and displays the deployed contract address.

### I4: Promote to Live
1. Deploy a contract to the **Local Simulation Sandbox**.
2. Run some test calls on it.
3. Click the **Promote to Live Network** option in the Simulated Chain (History) or Interaction tab.
4. Verify the IDE prompts you to connect your MetaMask wallet and deploy the same contract state to a real network (e.g., Sepolia).

---

## 🐙 2. GitHub OAuth Import & Export (Checklist J2–J3)

Because automated tests cannot walk through the full multi-factor OAuth authorization flow of GitHub, this integration requires manual validation.

### J2: Import Repository
1. Click the **GitHub Sync** button in the header.
2. If not logged in, click **Connect GitHub** and follow the browser redirection to authorize the CryptP application on GitHub.
3. Once redirected back, select **Import Repository**.
4. Choose a repository and branch from the list.
5. Verify the files are pulled down and populate a new workspace in the file explorer.

### J3: Export / Sync Changes
1. Modify a file in a GitHub-linked workspace.
2. Open the **GitHub Sync** modal.
3. Enter a commit message and click **Commit and Push**.
4. Check the repository on GitHub to verify the new commit and code modifications are uploaded.

---

## 🤖 3. AI Assistant with Real API Keys (Checklist G2)

Real keys (OpenAI / Gemini) are kept out of GitHub secrets/CI configurations for security reasons.

### G2: AI Chat with Active Key
1. Go to the **Settings** sidebar (Gear icon) and paste a valid OpenAI or Gemini API key. Click **Save**.
2. Open the **AI Assistant** sidebar (Sparkles or AI logo icon).
3. Type a Solidity question, such as: `Explain the security vulnerability in this contract: ...`
4. Verify the assistant returns a detailed, contextual response outlining the contract's logic or issues.
5. Try clicking **Audit Contract** or **Optimize Gas** shortcuts in the editor/panel.
6. Verify the AI is context-aware and reviews the active file.

---

## 📂 4. File / Folder Local Import (Checklist B5)

Browser security sandboxing prevents headless scripts from interacting with native operating system file picker dialogs.

### B5: Import Folder
1. Open the **Explorer** sidebar.
2. Click the **Import Files/Folders** icon (or right-click and select import folder).
3. Select a local directory containing one or more `.sol` files.
4. Verify the files are read, uploaded to Supabase, and correctly displayed in the project tree hierarchy.
