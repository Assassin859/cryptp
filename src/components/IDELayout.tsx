import React, { useState, useEffect } from 'react';
import { FileCode, Globe, Check, AlertTriangle, Wallet, LogOut, ShieldCheck, Download, Zap, ExternalLink } from 'lucide-react';



import { supabase } from '../utils/supabaseClient';
import SolidityEditor from './SolidityEditor';
import ContractFileBrowser from './ContractFileBrowser';
import SimulatedChain from './SimulatedChain';
import ContractInteraction from './ContractInteraction';
import { SimulatedDeployment } from '../types';
import { allTemplates } from '../utils/contractTemplates';
import { CompilationResult } from '../utils/hardhatCompiler';
import {
  Project,
  getProjects,
  getCompilations,
  getDeployments,
  deleteDeployments,
  createProject,
  updateProject,
  saveCompilation,
  saveDeployment,
  migrateLocalStorageToSupabase
} from '../utils/userData';

interface IDELayoutProps {
  userId: string;
}

const IDELayout: React.FC<IDELayoutProps> = ({ userId }: IDELayoutProps) => {
  const [activeSection, setActiveSection] = useState<'docs' | 'code'>('code');
  const [showRightPanel, setShowRightPanel] = useState<'editor' | 'contracts' | 'simulated' | 'interact'>('editor');


  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [simulations, setSimulations] = useState<SimulatedDeployment[]>([]);

  // Move SolidityEditor state here to persist across panel switches
  const [code, setCode] = useState<string>(allTemplates[0].code);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('basic');
  const [compileResult, setCompileResult] = useState<CompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [activeDeployment, setActiveDeployment] = useState<{ address: string; abi: any[]; network: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [hasWallet, setHasWallet] = useState<boolean>(false);
  const [showWalletBanner, setShowWalletBanner] = useState<boolean>(true);


  // Load projects and migrate data on mount
  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setCurrentProject(null);
      setCode(allTemplates[0].code);
      setSelectedTemplate('basic');
      setSimulations([]);
      setCompileResult(null);
      setIsLoadingProjects(false);
      return;
    }

    const loadUserData = async () => {
      setIsLoadingProjects(true);
      try {
        // Migrate any existing localStorage data to Supabase
        await migrateLocalStorageToSupabase(userId);

        // Load projects from Supabase
        const userProjects = await getProjects(userId);
        setProjects(userProjects);

        // Set current project (most recent or create default)
        if (userProjects.length > 0) {
          const mostRecent = userProjects[0];
          setCurrentProject(mostRecent);
          setCode(mostRecent.code);
          setSelectedTemplate(mostRecent.template);

          // Fetch the latest compilation history for this project
          const projectCompilations = await getCompilations(userId, mostRecent.id);
          if (projectCompilations.length > 0) {
              setCompileResult(projectCompilations[0].result);
          } else {
              setCompileResult(null);
          }

          // Fetch deployment history for this project
          const projectDeployments = await getDeployments(userId, mostRecent.id);
          
          // Use a Map to filter by transactionHash to ensure uniqueness
          const uniqueDeployments = new Map();
          projectDeployments.forEach(d => {
            const txHash = d.tx_hash || '';
            if (txHash && !uniqueDeployments.has(txHash)) {
              uniqueDeployments.set(txHash, d.simulated_chain || {
                network: d.network,
                transactionHash: d.tx_hash || '',
                contractAddress: d.contract_address || '',
                status: (d.status === 'success' || d.status === 'confirmed') ? 'confirmed' : (d.status === 'failed' ? 'failed' : 'pending'),
                gasUsed: Number(d.gas_used) || 0,
                deployer: d.deployer || '',
                timestamp: d.timestamp,
                blockNumber: 0,
                isRealChain: false
              });
            }
          });
          
          setSimulations(Array.from(uniqueDeployments.values()));
        } else {
          // Create default project
          const defaultProject = await createProject(userId, {
            name: 'My First Project',
            code: allTemplates[0].code,
            template: 'basic'
          });
          setCurrentProject(defaultProject);
          setProjects([defaultProject]);
          setSimulations([]);
          setCompileResult(null);
        }
      } catch (error) {
        console.error('Failed to load user data from Supabase:', error);
        // Fallback or error state could be added here
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadUserData();
  }, [userId]);

  // Wallet detection
  useEffect(() => {
    const checkWallet = () => {
      const isAvailable = typeof window !== 'undefined' && !!window.ethereum;
      setHasWallet(isAvailable);
    };

    checkWallet();
    // Listen for provider changes if possible
    if (window.ethereum) {
       window.ethereum.on('accountsChanged', checkWallet);
       return () => window.ethereum?.removeListener('accountsChanged', checkWallet);
    }
  }, []);


  // Save code changes to Supabase
  useEffect(() => {
    if (!currentProject || isLoadingProjects) return;

    const saveCode = async () => {
      try {
        await updateProject(currentProject.id, { code, template: selectedTemplate });
      } catch (error) {
        console.error('Failed to save code:', error);
      }
    };

    // Debounce saves
    const timeoutId = setTimeout(saveCode, 1000);
    return () => clearTimeout(timeoutId);
  }, [code, selectedTemplate, currentProject, isLoadingProjects]);

  // Save compile results to Supabase
  useEffect(() => {
    if (!currentProject || !compileResult) return;

    const saveCompileResult = async () => {
      try {
        // Only save if it's a new compile (e.g., successful)
        // Check if we already have this compilation saved (optional optimization)
        await saveCompilation(userId, currentProject.id, compileResult);
      } catch (error) {
        console.error('Failed to save compilation:', error);
      }
    };

    saveCompileResult();
  }, [compileResult, currentProject, userId]);

  console.log('IDELayout state:', { userId, currentProject: currentProject?.id, projectsCount: projects.length, codeLength: code?.length, selectedTemplate, hasCompileResult: !!compileResult, showRightPanel });

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear localStorage items prefixed with cryptp-
      Object.keys(localStorage)
        .filter(key => key.startsWith('cryptp-'))
        .forEach(key => localStorage.removeItem(key));
      // Refresh to ensure all states are reset (since App handles the redirect)
      window.location.reload();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const addSimulation = (entry: SimulatedDeployment) => {
    console.log('Adding simulation:', entry);
    // 1. Update local state immediately for fast UI
    setSimulations((prev) => {
      const isDuplicate = prev.some(s => s.transactionHash === entry.transactionHash);
      if (isDuplicate) return prev;
      return [entry, ...prev];
    });

    // 2. Perform side effect OUTSIDE of state updater
    if (currentProject) {
      saveDeployment(userId, currentProject.id, {
        simulated_chain: entry,
        network: entry.network,
        tx_hash: entry.transactionHash,
        contract_address: entry.contractAddress,
        status: entry.status,
        gas_used: entry.gasUsed,
        deployer: entry.deployer
      })
      .then(() => console.log('Deployment saved to Supabase'))
      .catch(error => console.error('Failed to save deployment:', error));
    }

    // 3. Update interaction panel
    setActiveDeployment({
      address: entry.contractAddress,
      abi: compileResult?.abi || [],
      network: entry.network
    });
    setShowRightPanel('interact');
  };

  const handleResetChain = async () => {
    if (!currentProject) return;
    
    try {
      const { browserVM } = await import('../utils/browserVM');
      await browserVM.reset();
      
      // Clear from database
      await deleteDeployments(userId, currentProject.id);
      
      setSimulations([]);
      setShowResetConfirm(false);
      console.log('Simulated chain and history cleared.');
    } catch (error) {
      console.error('Failed to reset simulated chain:', error);
    }
  };

  const documentationPanel = (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 md:p-6">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400">
          ERC-20 Token Guide
        </h1>
        <p className="text-lg text-gray-300 max-w-2xl">
          Learn the deployment process, then use the code editor to compile and deploy your contract.
        </p>
      </header>

      <div className="space-y-6">
        <div className="bg-indigo-900/30 backdrop-blur-sm p-4 rounded-lg border border-indigo-700/50 hover:shadow-indigo-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-indigo-500/20 rounded-lg flex items-center justify-center mr-3">
              <FileCode className="h-5 w-5 text-indigo-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 0: Choose Contract Type</h2>
          </div>
          <p className="text-gray-300 text-sm mb-3">
            Select a template to start with different token capabilities:
          </p>
          <ul className="text-gray-300 text-sm space-y-2 ml-2">
            <li><strong className="text-blue-400">Basic</strong> - Standard ERC-20 with fixed supply</li>
            <li><strong className="text-green-400">Burnable</strong> - Users can burn their own tokens</li>
            <li><strong className="text-purple-400">Mintable</strong> - Owner can create new tokens</li>
            <li><strong className="text-yellow-400">Pausable</strong> - Owner can pause all transfers</li>
            <li><strong className="text-cyan-400">Capped</strong> - Maximum supply limit enforced</li>
          </ul>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
              <FileCode className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 1: Understand Solidity</h2>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
            <li>ERC-20 is the Ethereum token standard</li>
            <li>Your contract inherits from ERC20 base contract</li>
            <li>The constructor creates the initial token supply</li>
            <li>Edit the code to customize your token</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
              <Check className="h-5 w-5 text-green-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 2: Compile & Check</h2>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
            <li>Click "Compile" button to check for errors</li>
            <li>Fix any syntax errors shown</li>
            <li>ABI and bytecode generate on success</li>
            <li>Copy them for deployment</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3">
              <FileCode className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 3: Copy Base Contracts</h2>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
            <li>Use the Base Contracts tab to inspect/Foundation files</li>
            <li>Copy the contracts to Remix for deployment</li>
            <li>Pass through each dependency file correctly</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
              <Wallet className="h-5 w-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 4: Deploy on Remix or MetaMask</h2>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
            <li>Open <a href="https://remix.ethereum.org" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Remix IDE</a> OR use the IDE deploy panel</li>
            <li>Select Sepolia (or Goerli) in MetaMask</li>
            <li>Fund test ETH via faucet, then deploy through MetaMask confirmation</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-cyan-500/20 rounded-lg flex items-center justify-center mr-3">
              <FileCode className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 6: Simulated Blockchain Panel</h2>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
            <li>Open the "Simulated Blockchain" panel to view deployment history</li>
            <li>Each successful deploy appears as a block entry (network, tx, contract, gas, status)</li>
            <li>Use this for learning and quick verification before moving to production</li>
          </ol>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-3">
            <div className="h-8 w-8 bg-yellow-500/20 rounded-lg flex items-center justify-center mr-3">
              <Globe className="h-5 w-5 text-yellow-400" />
            </div>
            <h2 className="text-lg font-semibold">Step 5: Test Your Token</h2>
          </div>
          <ol className="text-gray-300 space-y-2 list-decimal list-inside text-sm">
            <li>Install MetaMask and connect it to testnet</li>
            <li>Acquire test ETH from faucet and send</li>
            <li>Verify token transfer/pause/mint logic</li>
          </ol>
        </div>

        <div className="bg-blue-900/30 backdrop-blur-sm p-6 rounded-xl border border-blue-500/50 hover:shadow-blue-500/10 transition-all">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-4">
              <ShieldCheck className="h-6 w-6 text-blue-400" />
            </div>
            <h2 className="text-xl font-bold">MetaMask & Wallet Setup</h2>
          </div>
          <p className="text-gray-300 mb-6 leading-relaxed">
            To move beyond the local simulation and deploy your tokens to real test networks like Sepolia, you need a Web3 wallet.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Download className="h-4 w-4" />
                1. Install Extension
              </h3>
              <p className="text-xs text-gray-400 mb-3">Grab the official extension for your browser:</p>
              <div className="flex flex-wrap gap-2">
                <a href="https://metamask.io/download/" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-orange-600/20 hover:bg-orange-600/40 text-orange-400 rounded text-[10px] font-bold border border-orange-500/30 flex items-center gap-1">
                   MetaMask (Chrome/Brave) <ExternalLink className="h-3 w-3" />
                </a>
                <a href="https://www.opera.com/crypto/next" target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-[10px] font-bold border border-red-500/30 flex items-center gap-1">
                   Opera Crypto Wallet <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
            <div className="bg-black/30 p-4 rounded-lg border border-gray-700">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                2. Setup Account
              </h3>
              <ul className="text-xs text-gray-400 space-y-2 list-disc list-inside">
                <li>Create a new wallet and <b>secure your seed phrase</b></li>
                <li>Switch network to <b>Sepolia Test Network</b></li>
                <li>Visit a <a href="https://sepoliafaucet.com/" target="_blank" rel="noreferrer" className="text-blue-400 underline">Sepolia Faucet</a> for free test ETH</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-600/10 p-4 rounded-lg border border-blue-400/20">
            <h4 className="text-sm font-bold text-blue-300 mb-1">💡 Sandbox Mode is Active</h4>
            <p className="text-xs text-blue-200/70">
              Don't want to install a wallet? No problem. The IDE automatically uses an <b>In-Browser EVM</b>, allowing you to compile and test logic without any extensions!
            </p>
          </div>
        </div>

        <div className="bg-orange-900/20 border border-orange-700/50 p-4 rounded-lg">

          <h3 className="text-orange-400 font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Important Tips
          </h3>
          <ul className="text-orange-300 text-sm space-y-1">
            <li>✓ Always test on testnet first</li>
            <li>✓ Never share your private keys</li>
            <li>✓ Save your contract address after deployment</li>
            <li>✓ Gas fees apply on mainnet</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const codePanel = (
    <div className="h-full flex flex-col min-w-0 bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 p-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setShowRightPanel('editor')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              showRightPanel === 'editor' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Code Editor
          </button>
          <button
            onClick={() => setShowRightPanel('contracts')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              showRightPanel === 'contracts' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            📁 Base Contracts
          </button>
          <button
            onClick={() => setShowRightPanel('simulated')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
              showRightPanel === 'simulated' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔗 Simulated Blockchain
          </button>
          <button
            onClick={() => setShowRightPanel('interact')}
            disabled={!activeDeployment}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition flex items-center gap-2 ${
              showRightPanel === 'interact' ? 'bg-green-600 text-white' : (!activeDeployment ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-700 text-gray-300 hover:bg-gray-600')
            }`}
          >
            🕹️ Interact
          </button>
        </div>
      </div>
      
      {showWalletBanner && !hasWallet && (
        <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-4 py-2 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500/20 p-1.5 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-gray-200">Local Sandbox Mode Active</span>
              <span className="text-[10px] text-gray-400">No Web3 wallet detected. You can still compile and simulate contracts locally.</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveSection('docs')}
              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition underline decoration-indigo-500/30 underline-offset-2"
            >
              Learn how to install MetaMask
            </button>
            <button 
              onClick={() => setShowWalletBanner(false)}
              className="text-gray-500 hover:text-gray-300 transition"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">

        {showRightPanel === 'editor' && (
          <SolidityEditor
            code={code}
            selectedTemplate={selectedTemplate}
            compileResult={compileResult}
            isCompiling={isCompiling}
            onCodeChange={setCode}
            onTemplateChange={setSelectedTemplate}
            onCompileResultChange={setCompileResult}
            onCompilingChange={setIsCompiling}
            onNewDeployment={addSimulation}
          />
        )}
        {showRightPanel === 'contracts' && <ContractFileBrowser />}
        {showRightPanel === 'simulated' && (
          <div className="h-full relative">
            <SimulatedChain 
              deployments={simulations} 
              onReset={() => setShowResetConfirm(true)} 
              onInteract={(deploy) => {
                setActiveDeployment({
                  address: deploy.contractAddress,
                  abi: compileResult?.abi || [], // Fallback to current abi if possible
                  network: deploy.network
                });
                setShowRightPanel('interact');
              }}
            />
            
            {showResetConfirm && (
              <div className="absolute inset-0 z-50 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-gray-800 border border-red-500/30 rounded-lg shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center gap-3 text-red-400 mb-4">
                    <AlertTriangle className="h-6 w-6" />
                    <h3 className="text-lg font-bold">Reset Blockchain History?</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                    This will <span className="text-red-300 font-semibold underline">permanently delete</span> all deployment history for this project from the database. This action cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded font-medium transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleResetChain}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow-lg shadow-red-900/20 transition"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {showRightPanel === 'interact' && activeDeployment && (
          <div className="h-full p-4">
             <ContractInteraction 
               abi={activeDeployment.abi} 
               address={activeDeployment.address} 
               network={activeDeployment.network}
               onRefreshSimulations={() => {
                 // Trigger a slight refresh or re-fetch if needed
                 console.log('Interaction triggered state change, UI updated.');
               }}
             />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      <div className="flex gap-2 px-4 py-3 border-b border-gray-700 bg-gray-800">
        <button
          onClick={() => setActiveSection('docs')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
            activeSection === 'docs' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Documentation & Theory
        </button>
        <button
          onClick={() => setActiveSection('code')}
          className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
            activeSection === 'code' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Code Editor & Tools
        </button>
        <div className="flex-1"></div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium bg-red-900/40 text-red-300 border border-red-700/50 hover:bg-red-800/60 transition"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
      <div className="flex-1 overflow-hidden">
        {activeSection === 'docs' ? documentationPanel : codePanel}
      </div>
    </div>
  );
};

export default IDELayout;
