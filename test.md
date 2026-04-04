# 🔬 CryptP Comprehensive Testing Guide

Welcome to the **QA & Validation Script** for the CryptP Protocol Engineering Suite. This document provides step-by-step instructions (with explicit code snippets) for testing the platform across all levels of expertise—from a basic login state up to deep EVM forensic debugging of intentionally flawed code.

---

## 🏗️ Phase 1: Authentication & Lifecycle

### Test 1: Cold Boot & Auth
1. **Action**: Open the application in an incognito window at `http://localhost:5173`.
2. **Expectation**: You are presented with the sleek login screen.
3. **Action**: Authenticate via GitHub or Google.
4. **Validation**: You are routed to the central IDE. The Left Sidebar (Explorer) automatically creates a `First Project` workspace and an empty `Contract.sol`.

### Test 2: Zombie Session Defense
1. **Action**: While logged in, open a duplicate tab. 
2. **Action**: In the first tab, click **Log Out** (bottom left profile icon).
3. **Action**: Return to the duplicate tab and click on the Editor.
4. **Validation**: The IDE should forcefully eject you to the login screen, proving it aggressively monitors invalid JWT states across the browser.

---

## 💻 Phase 2: Editor Experience & "Wrong Code"

### Test 3: The Asset Factory Injection
1. **Action**: Open the **Token Factory** (hammer icon in Left Activity Bar).
2. **Action**: Select **ERC-721 (NFT)**. Toggle **Mintable** and **Governance** to `ON`.
3. **Action**: Click "Inject Code".
4. **Validation**: The main editor immediately replaces the active file with a perfectly formatted OpenZeppelin 5.0 contract incorporating `ERC721Votes` and `ERC721Permit`.

### Test 4: Scenario - "Wrong Code" (Syntax Enforcement)
Let's see how the node compiler handles developer mistakes.
1. **Action**: Write the following completely invalid Solidity code:
   ```solidity
   pragma solidity ^0.8.20;
   contract Broken {
     function noBrackets() public return uint256 
       uint x = 50
     }
   }
   ```
2. **Action**: Click **Compile** (top center).
3. **Validation**: The bottom terminal slides open, highlighting the exact lines where you missed the `returns(...)` braces and the semicolon `;`. The red squiggly lines appear in the Monaco editor itself.

---

## 🛡️ Phase 3: Vulnerability & Security Analytics

### Test 5: Scenario - "Vulnerable Code" (Reentrancy)
Let's test the background Static Analysis (SAST) and Security Radar.
1. **Action**: Paste the following vulnerable code into the editor:
   ```solidity
   pragma solidity ^0.8.20;
   contract Bank {
       mapping(address => uint) public balances;
       
       function withdraw() public {
           uint bal = balances[msg.sender];
           require(bal > 0);
           // VULNERABILITY: State change happens after external call
           (bool sent, ) = msg.sender.call{value: bal}("");
           require(sent, "Failed");
           balances[msg.sender] = 0;
       }
   }
   ```
2. **Action**: Wait ~1 second for the debounced Auto-Scanner.
3. **Validation**:
   - The Security Tab (shield icon) illuminates with a **High Severity: Reentrancy** finding.
   - Open the **Analytics Dashboard** (Bar Chart icon). 
   - The **Security Radar** polygon collapses severely on the "Reentrancy" and "Logic" axes, and the Safety Score drops drastically into the red.

### Test 6: Scenario - "Risky Code" (Centralization)
1. **Action**: Paste `address public owner = tx.origin;` inside a constructor.
2. **Validation**: The AST scanner detects `tx.origin` and flags a **Centralization/Access Control** risk, adjusting the radar chart appropriately.

---

## 📉 Phase 4: Economics & Storage Efficiency

### Test 7: Scenario - "Less Gas Efficient" (Unpacked Storage)
EVM variables cost 20,000 gas per slot. Let's force the developer to waste gas by writing poorly packed variables, and test if the `StorageAnalyzer` catches it.
1. **Action**: Paste this unoptimized variable structure:
   ```solidity
   pragma solidity ^0.8.20;
   contract Unoptimized {
       uint128 public firstHalf;    // Uses Slot 0
       uint256 public giantMiddle;  // Uses Slot 1 (forces 'firstHalf' to stay alone)
       uint128 public secondHalf;   // Uses Slot 2
   }
   ```
2. **Action**: Compile the contract.
3. **Action**: Open the **Analytics Dashboard** (Bar Chart icon).
4. **Validation**: Under the **Storage Slot Map**, you will see Slots 0, 1, and 2 marked as actively used. Slots 0 and 2 will be highlighted in **Orange** (Unpacked Slot warning), telling the developer that if they simply sorted the variables as `uint128, uint128, uint256`, they could fit into exactly 2 slots instead of 3, saving thousands of gas.

### Test 8: Scenario - "Dynamic UI Binding Verification" (No Mock Data)
We must ensure the Analytical Dashboards and Interaction panels are perfectly tethered to the compiler's Abstract Syntax Tree (AST), and are never displaying generic dummy data.
1. **Action**: Create a simple contract strictly containing exactly **3 functions** (e.g., `mint`, `burn`, and `balanceOf`).
   ```solidity
   pragma solidity ^0.8.20;
   contract TriFunc {
       function mint() public {}
       function burn() public {}
       function balanceOf() public pure returns (uint) { return 0; }
   }
   ```
2. **Action**: Compile and then Deploy to the local sandbox.
3. **Validation**: 
   - Open the **Analytics Dashboard**. In the **Gas Usage Distribution** Bar Chart, verify there are *exactly* 3 bars plotted (one for each function) and absolutely no other default or dummy methods.
   - Open the **Interaction Panel**. Verify there are *exactly* 2 action cards under "Write Functions" (`mint`, `burn`) and *exactly* 1 card under "Read Functions" (`balanceOf`). 
   - Add a 4th function, re-compile, and verify the UI instantly scales to 4 bars/buttons without a page hard-refresh.

### Test 9: Scenario - "Gas DoS / Out of Gas" (Unbounded Loops)
Let's see what happens when a developer creates a loop that scales dangerously.
1. **Action**: Paste the following array loop:
   ```solidity
   pragma solidity ^0.8.20;
   contract LoopDoS {
       uint[] public payees;
       function addPayees(uint amount) public {
           for (uint i = 0; i < amount; i++) { payees.push(i); }
       }
   }
   ```
2. **Action**: Deploy to the local sandbox.
3. **Action**: In the Interaction panel, call `addPayees(2500)`.
4. **Validation**: The Gas Profiler execution trace will show catastrophic gas burn. The exact line `payees.push(i)` will be glowing deep red indicating loop inefficiency. The `Cost Projection` chart will indicate this single transaction would cost thousands of dollars on Ethereum mainnet.

---

## 🛡️ Phase 4.5: Advanced Vulnerability Analytics

### Test 9: Scenario - "Locked Ether" (No Withdraw Mechanism)
1. **Action**: Paste a contract that accepts ether but forgets to add a withdraw function.
   ```solidity
   pragma solidity ^0.8.20;
   contract BlackHole {
       receive() external payable {}
   }
   ```
2. **Action**: Compile.
3. **Validation**: The SAST scanner should flag "Locked Ether". The Radar Chart will heavily dock the "Logic" score.

### Test 10: Scenario - "Unchecked Call Return"
1. **Action**: Paste a contract ignoring a low-level call return.
   ```solidity
   pragma solidity ^0.8.20;
   contract Careless {
       function sendEther(address payable to) public payable {
           to.call{value: msg.value}(""); // Fails to check return!
       }
   }
   ```
2. **Action**: Compile.
3. **Validation**: Scanner triggers "Unchecked Return Value". The radar docks "Logic" and "Reentrancy" vectors.

---

## ⚡ Phase 5: Deep Debugging & Trace Profiling

### Test 11: End-to-End Execution Trace
In this test, we deploy to our local sandbox and physically execute a transaction to see exact gas burn.
1. **Action**: Create a clean ERC-20 contract (via the factory) and Compile it without errors.
2. **Action**: Navigate to the **Chain Viewer** (Server Database icon) and click **Deploy to Local VM**.
3. **Validation**: At the bottom of the Chain Viewer tab, an active "Simulated Block" appears containing your contract address and deployment txHash.
4. **Action**: Go to the **Interaction Panel** (Play button icon). Select the new deployment.
5. **Action**: Open the **Gas Profiler** (Orange Flame icon in the active Right Sidebar).
6. **Action**: In the Interaction Panel under "Write Functions", locate the `mint` function. Enter a test address (e.g., `0x123...abc`) and a uint256 (e.g., `1000000`). Click Execute.
7. **Validation**: 
   - A pulsing orange spinner appears in the Gas Profiler while the EVM trace runs.
   - Once resolved, you will get a **Line-by-Line Heatmap**. 
   - The exact line inside OpenZeppelin's `_update` logic (e.g., `_balances[to] += value`) will glow red or yellow, identifying the physical mathematical calculation that consumed the bulk of the ~45,000 transaction gas limit.

---

## 🔍 Phase 6: Global Visibility & User Errors

### Test 12: Workspace Discovery
1. **Action**: In the Explorer, create a second Project called "Defi Yield". Let a file named `Yield.sol` sit inside it.
2. **Action**: Add `uint256 public rewardPoolSize;` to `Yield.sol`.
3. **Action**: Ensure you are looking at your original ERC20 project (Project 1).
4. **Action**: Open the **Search Tab** (Magnifying Glass). Type `rewardPool`.
5. **Validation**: The IDE instantly looks *across* different projects, finds `rewardPoolSize` in `Yield.sol`, and tells you what line it is on. Clicking the search hit will physically swap your workspace to "Defi Yield" and open the file.

### Test 13: Scenario - "Invalid User Execution Data"
Let's see how the IDE handles front-end user mistakes when calling a contract.
1. **Action**: Deploy a standard ERC-20 contract from the factory.
2. **Action**: In the Interaction tab, look for `transfer(address to, uint256 amount)`.
4. **Validation**: The interaction form should gracefully catch the parsing error *before* attempting VM simulation, preventing a frontend crash and alerting the user to invalid input formats.

---

## 🚀 Phase 9: Production Suite & MetaMask Integration

### Test 14: Global Provider Connection & Environment Detection
1. **Action**: Open the IDE in a browser environment (or incognito window) where the MetaMask browser extension is completely disabled or uninstalled.
2. **Validation 1**: A persistent red error banner should immediately render across the top of the IDE stating: "MetaMask not detected. Live deployment and network promotion features are currently disabled." with an active installation hyperlink.
3. **Action**: Enable/Install MetaMask and refresh the window.
4. **Action**: Click the **Connect Wallet** button in the Top Header.
5. **Validation 2**: The MetaMask extension pops open requesting authorization. The Top Header gracefully updates to display your chosen network (e.g. Sepolia), a quick-faucet action link, and your ETH balance.
6. **Action**: Change your network manually inside the MetaMask extension.
7. **Validation 3**: The IDE automatically detects the global chain shift and re-renders the Web3 connection provider state in the header.

### Test 15: The Deployment "Promotion" Pipeline
We strictly enforce testing on our Custom Backend Sandbox before rolling code out to a Live public blockchain. 
1. **Action**: Start by deploying an ERC-20 contract strictly to the **Local Sandbox**.
2. **Action**: Validate its Heatmaps via Test 11.
3. **Action**: In your Database/Chain History UI tab, look at the deployed block for the contract.
4. **Validation 1**: Inside the tooltip, there will be a glowing **[Promote via MetaMask]** button because you are in a Local sandbox.
5. **Action**: Click `Promote via MetaMask`.
6. **Validation 2**: A rigorous browser confirmation dialouge immediately suspends execution. It clearly warns you that "Gas prices will be real and subject to network volatility" and notes that "Line-by-Line Gas Heatmaps are disabled".
7. **Action**: Click `OK` to acknowledge the financial risks.
8. **Validation 3**: A real MetaMask window pops open asking you to sign an active contract deployment to Sepolia/Mainnet. Wait for the transaction confirmation. A *new* block will magically appear in the History UI with the status "Live on Sepolia Testnet".

### Test 16: Dynamic Interaction Routing & Security Fallbacks
When a contract is successfully "Promoted", the IDE must seamlessly route subsequent commands outside of the local sandbox and into the live blockchain.
1. **Action**: Open the Interaction panel for the brand new **Promoted** contract.
2. **Validation 1**: You will clearly see a highly visible purple `PROMOTED` banner next to the network name, alerting you that this is NOT a simulation and gas constraints are real.
3. **Action**: Execute the `mint` function again.
4. **Validation 2**: The IDE correctly routes the command into `ethers.Contract` causing a MetaMask popup for signature rather than executing internally in the `browserVM`.
5. **Validation 3**: Validate that the Gas Heatmap Profiler gracefully respects local vs live transaction blocks natively, preventing unnecessary and costly node RPC requests.
