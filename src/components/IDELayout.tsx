import React, { useState, useEffect } from 'react';
import { FileCode, Globe, Check, AlertTriangle, Wallet } from 'lucide-react';
import SolidityEditor from './SolidityEditor';
import ContractFileBrowser from './ContractFileBrowser';
import SimulatedChain from './SimulatedChain';
import { SimulatedDeployment } from '../types';
import { allTemplates } from '../utils/contractTemplates';
import { CompileResult } from '../utils/hardhatCompiler';
import {
  Project,
  getProjects,
  createProject,
  updateProject,
  saveCompilation,
  saveDeployment,
  migrateLocalStorageToSupabase
} from '../utils/userData';

interface IDELayoutProps {
  userId: string;
}

const IDELayout: React.FC<IDELayoutProps> = ({ userId }) => {
  const [activeSection, setActiveSection] = useState<'docs' | 'code'>('code');
  const [showRightPanel, setShowRightPanel] = useState<'editor' | 'contracts' | 'simulated'>('editor');

  const storageKey = (key: string) => `cryptp-${userId}-${key}`;

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  const [simulations, setSimulations] = useState<SimulatedDeployment[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = window.localStorage.getItem(storageKey('simulations'));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Move SolidityEditor state here to persist across panel switches
  const [code, setCode] = useState<string>(() => {
    if (typeof window === 'undefined') return allTemplates[0].code;
    return window.localStorage.getItem(storageKey('code')) || allTemplates[0].code;
  });
  const [selectedTemplate, setSelectedTemplate] = useState<string>(() => {
    if (typeof window === 'undefined') return 'basic';
    return window.localStorage.getItem(storageKey('selectedTemplate')) || 'basic';
  });
  const [compileResult, setCompileResult] = useState<CompileResult | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem(storageKey('compileResult'));
      return saved ? (JSON.parse(saved) as CompileResult) : null;
    } catch {
      return null;
    }
  });
  const [isCompiling, setIsCompiling] = useState(false);

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
        } else {
          // Create default project
          const defaultProject = await createProject(userId, {
            name: 'My First Project',
            code: allTemplates[0].code,
            template: 'basic'
          });
          setCurrentProject(defaultProject);
          setProjects([defaultProject]);
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        // Fallback to localStorage if Supabase fails
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadUserData();
  }, [userId]);

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
        await saveCompilation(userId, currentProject.id, compileResult);
      } catch (error) {
        console.error('Failed to save compilation:', error);
      }
    };

    saveCompileResult();
  }, [compileResult, currentProject, userId]);

  console.log('IDELayout state:', { userId, currentProject: currentProject?.id, projectsCount: projects.length, codeLength: code?.length, selectedTemplate, hasCompileResult: !!compileResult, showRightPanel });

  const addSimulation = (entry: SimulatedDeployment) => {
    console.log('Adding simulation:', entry);
    setSimulations((prev) => {
      const next = [entry, ...prev];
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey('simulations'), JSON.stringify(next));
      }

      // Save to Supabase
      if (currentProject) {
        saveDeployment(userId, currentProject.id, {
          simulated_chain: entry,
          network: entry.network,
          tx_hash: entry.transactionHash,
          contract_address: entry.contractAddress,
          status: entry.status,
          gas_used: entry.gasUsed,
          deployer: entry.deployer
        }).catch(error => console.error('Failed to save deployment:', error));
      }

      return next;
    });
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
        </div>
      </div>
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
        {showRightPanel === 'simulated' && <SimulatedChain deployments={simulations} />}
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
      </div>
      <div className="flex-1 overflow-hidden">
        {activeSection === 'docs' ? documentationPanel : codePanel}
      </div>
    </div>
  );
};

export default IDELayout;
