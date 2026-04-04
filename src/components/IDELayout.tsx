import React, { useState, useEffect } from 'react';
import { 
  FileCode, 
  Play, 
  Settings, 
  Zap, 
  Check,
  ChevronLeft,
  Terminal,
  Code2,
  BookOpen,
  FolderTree,
  Search,
  Bug,
  LayoutGrid,
  FolderOpen,
  Wallet,
  Info,
  BarChart3,
  Flame,
  Github
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { browserVM } from '../utils/browserVM';
import { parseSourceMap, mapTraceToLines } from '../utils/traceMapper';
import { 
  getProjects, 
  createProject,
  deleteProject,
  Project,
  saveCompilation,
  getCompilations,
  saveDeployment,
  getDeployments
} from '../utils/userData';
import { allTemplates } from '../utils/contractTemplates';
import { CompilationResult } from '../utils/hardhatCompiler';
import { SimulatedDeployment } from '../types';
import SolidityEditor from './SolidityEditor';
import SimulatedChain from './SimulatedChain';
import ProjectExplorer from './ProjectExplorer';
import ContractInteraction from './ContractInteraction';
import TokenFactory from './TokenFactory';
import CompileOutput from './CompileOutput';
import TokenSearch from './TokenSearch';
import SecurityAudit from './SecurityAudit';
import AIChat from './AIChat';
import NewWorkspaceModal from './NewWorkspaceModal';
import { GitHubSyncModal } from './GitHubSyncModal';
import LinkIdentityModal from './LinkIdentityModal';
import AnalyticsSidebar from './AnalyticsSidebar';
import SettingsSidebar from './SettingsSidebar';
import GasProfiler from './GasProfiler';
import DocsSidebar from './DocsSidebar';
import { User } from '@supabase/supabase-js';
import { SecurityReport, scanContract } from '../utils/securityScanner';
import { 
  ContractFile,
  createFile, 
  updateFile, 
  deleteFile, 
  migrateWorkspacesToFiles 
} from '../utils/userData';
import WalletConnect from './WalletConnect';
import { ethers } from 'ethers';

interface IDELayoutProps {
  userId: string;
  isNewUser?: boolean;
}

import { useWeb3 } from '../context/Web3Context';

const IDELayout: React.FC<IDELayoutProps> = ({ userId, isNewUser }) => {
  const { account, networkName, balance, isConnected, isConnecting, connect, signer } = useWeb3();

  const [activeActivity, setActiveActivity] = useState<'explorer' | 'factory' | 'interact' | 'chain' | 'docs' | 'search' | 'analytics'>('explorer');
  const [activeRightActivity, setActiveRightActivity] = useState<'ai' | 'profiler' | 'settings'>(isNewUser ? 'settings' : 'ai');
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [showSideBar, setShowSideBar] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [profilerData, setProfilerData] = useState<{ lineGasMap: Map<number, number>, totalGas: number }>({ lineGasMap: new Map(), totalGas: 0 });
  const [isProfiling, setIsProfiling] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isResizingRightSidebar, setIsResizingRightSidebar] = useState(false);

  const [showBottomPanel, setShowBottomPanel] = useState(true);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isResizingBottomPanel, setIsResizingBottomPanel] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'security'>('output');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  const [code, setCode] = useState<string>('');
  const [compileResult, setCompileResult] = useState<CompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [aiPromptOverride, setAiPromptOverride] = useState<{prompt: string, theme: string} | null>(null);

  const [simulations, setSimulations] = useState<SimulatedDeployment[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const [activeFileId, setActiveFileId] = useState<string | undefined>(undefined);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showLinkIdentityModal, setShowLinkIdentityModal] = useState(false);
  const [githubModalInitialTab, setGithubModalTab] = useState<'import' | 'export' | 'sync' | undefined>(undefined);
  
  const [activeDeployment, setActiveDeployment] = useState<{address: string, abi: any, network: string} | null>(null);

  const startResizingSidebar = (e: React.MouseEvent) => { e.preventDefault(); setIsResizingSidebar(true); };
  const startResizingRightSidebar = (e: React.MouseEvent) => { e.preventDefault(); setIsResizingRightSidebar(true); };
  const startResizingBottomPanel = (e: React.MouseEvent) => { e.preventDefault(); setIsResizingBottomPanel(true); };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingSidebar) {
        const newWidth = e.clientX - 48;
        if (newWidth > 160 && newWidth < 600) setSidebarWidth(newWidth);
      }
      if (isResizingRightSidebar) {
        const newWidth = window.innerWidth - e.clientX;
        if (newWidth > 200 && newWidth < 600) setRightSidebarWidth(newWidth);
      }
      if (isResizingBottomPanel) {
        const newHeight = window.innerHeight - e.clientY - 24; 
        if (newHeight > 100 && newHeight < (window.innerHeight - 200)) setBottomPanelHeight(newHeight);
      }
    };
    const stopResizing = () => {
      setIsResizingSidebar(false);
      setIsResizingRightSidebar(false);
      setIsResizingBottomPanel(false);
    };
    if (isResizingSidebar || isResizingRightSidebar || isResizingBottomPanel) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingSidebar, isResizingRightSidebar, isResizingBottomPanel]);

  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingProjects(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          setUserProfile(userData.user);

          const identities = userData.user.identities || [];
          const hasGithubOrGoogle = identities.some(i => i.provider === 'github' || i.provider === 'google');
          const hasDismissed = localStorage.getItem('cryptp-dismiss-link-modal');
          if (!hasGithubOrGoogle && !hasDismissed) {
             setShowLinkIdentityModal(true);
          }
        }

        const userProjects = await getProjects(userId);

        // Sync API keys from Supabase cloud
        try {
          const { data: settingsData, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
          if (settingsData && !error) {
            // Cloud-to-Scoped-Storage Sync
            const scopedAiKey = `cryptp-ai-keys-${userId}`;
            const scopedRpcKey = `cryptp-rpc-keys-${userId}`;
            if (settingsData.ai_keys) localStorage.setItem(scopedAiKey, JSON.stringify(settingsData.ai_keys));
            if (settingsData.rpc_keys) localStorage.setItem(scopedRpcKey, JSON.stringify(settingsData.rpc_keys));
          }
        } catch (e) {
          console.error("Could not sync cloud settings:", e);
        }
        const projectsWithFiles = await Promise.all(userProjects.map(async (p) => {
          const files = await migrateWorkspacesToFiles(userId, p);
          return { ...p, files };
        }));

        setProjects(projectsWithFiles);
        if (projectsWithFiles.length > 0) {
          const mostRecent = projectsWithFiles[0];
          setCurrentProject(mostRecent);
          
          if (mostRecent.files && mostRecent.files.length > 0) {
            const activeFile = mostRecent.files.find(f => f.id === mostRecent.active_file_id) || mostRecent.files[0];
            setActiveFileId(activeFile.id);
            setCode(activeFile.content);
          }
          
          const projectCompilations = await getCompilations(userId, mostRecent.id);
          setCompileResult(projectCompilations.length > 0 ? projectCompilations[0].result : null);
          const projectDeployments = await getDeployments(userId, mostRecent.id);
          const uniqueDeployments = projectDeployments.map(d => d.simulated_chain || {
            network: d.network, transactionHash: d.tx_hash || '', contractAddress: d.contract_address || '', status: d.status as any, gasUsed: Number(d.gas_used) || 0, deployer: d.deployer || '', timestamp: d.timestamp, blockNumber: 0, isRealChain: false
          });
          setSimulations(uniqueDeployments);
        }
      } catch (error) { console.error('Failed to load user data:', error); } finally { setIsLoadingProjects(false); }
    };
    loadUserData();
  }, [userId]);

  useEffect(() => {
    if (!code || isLoadingProjects || !activeFileId) return;
    const saveCode = async () => { 
      if (activeFileId) await updateFile(activeFileId, code); 
    };
    const timeoutId = setTimeout(saveCode, 1000);
    return () => clearTimeout(timeoutId);
  }, [code, activeFileId, isLoadingProjects]);



  useEffect(() => {
    if (!code || isLoadingProjects) return;
    const performScan = () => { setIsScanning(true); try { setSecurityReport(scanContract(code)); } finally { setIsScanning(false); } };
    const timeoutId = setTimeout(performScan, 500); 
    return () => clearTimeout(timeoutId);
  }, [code, isLoadingProjects]);

  const handleCompilationComplete = (result: CompilationResult | null) => {
    setCompileResult(result);
    if (result && currentProject) {
       saveCompilation(userId, currentProject.id, result);
       setShowBottomPanel(true);
       setActiveBottomTab('output');
    }
  };

  const triggerCompile = async () => {
    if (!code) return;
    setIsCompiling(true);
    try {
      // Find template by name for pre-compiled bytecode optimization
      const template = allTemplates.find(t => t.code === code);
      const hardcodedBytecode = template?.hardcodedBytecode;
      const projectFilesMap = currentProject?.files?.map((f: ContractFile) => ({ name: f.name, content: f.content }));
      
      const { compileWithHardhat } = await import('../utils/hardhatCompiler');
      const result = await compileWithHardhat(code, hardcodedBytecode, projectFilesMap);
      handleCompilationComplete(result);
    } catch (error) {
      console.error('Compilation error:', error);
      handleCompilationComplete({
        success: false,
        errors: [{ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }]
      });
    } finally {
      setIsCompiling(false);
    }
  };

  const triggerAIDeploy = async () => {
    if (!compileResult || !compileResult.success || !compileResult.bytecode) {
      alert("No successful compilation found to deploy.");
      return;
    }
    
    try {
       const { browserVM } = await import('../utils/browserVM');
       const result = await browserVM.deployContract(compileResult.bytecode);
       
       const newSim: SimulatedDeployment = {
         network: 'Local Simulation',
         transactionHash: result.transactionHash,
         contractAddress: result.contractAddress,
         status: 'confirmed',
         gasUsed: result.gasUsed,
         deployer: browserVM.getActiveAccount(),
         timestamp: new Date().toISOString(),
         blockNumber: await browserVM.getBlockNumber(),
         isRealChain: false
       };
       
       addSimulation(newSim);
    } catch (e: any) {
       console.error("AI Deployment failed", e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const addSimulation = (entry: SimulatedDeployment) => {
    setSimulations(prev => [entry, ...prev]);
    if (currentProject) {
      saveDeployment(userId, currentProject.id, { 
        simulated_chain: entry, network: entry.network, tx_hash: entry.transactionHash, contract_address: entry.contractAddress, status: entry.status, gas_used: entry.gasUsed, deployer: entry.deployer, abi: compileResult?.abi || []
      });
    }
    setActiveDeployment({ address: entry.contractAddress, abi: compileResult?.abi || [], network: entry.network });
    setActiveActivity('interact');
    setShowSideBar(true);
  };

  const handleResetChain = async () => {
    if (!currentProject) return;
    if (simulations.length === 0) {
      alert("There are no transactions to delete.");
      setShowResetConfirm(false);
      return;
    }
    setSimulations([]);
    setShowResetConfirm(false);
    const { deleteDeployments } = await import('../utils/userData');
    await deleteDeployments(userId, currentProject.id);
  };

  const handleDeleteProject = async (projectId: string) => {
     if (!confirm('Are you sure you want to permanently delete this workspace and all its files?')) return;
     try {
       await deleteProject(projectId);
       const updated = projects.filter(p => p.id !== projectId);
       setProjects(updated);
       
       if (currentProject?.id === projectId) {
         if (updated.length > 0) {
          const next = updated[0];
          setCurrentProject(next);
          if (next.files && next.files.length > 0) {
            const first = next.files[0];
            setActiveFileId(first.id);
            setCode(first.content);
          }
        } else {
          setCurrentProject(null);
          setActiveFileId(undefined);
          setCode('');
        }
       }
     } catch (e) {
       console.error('Failed to delete project:', e);
       alert('Failed to delete project. Please retry.');
     }
  };

  const handleCreateWorkspace = async (wsName: string, fName: string, templateId: string) => {
    try {
      const template = allTemplates.find(t => t.id === templateId);
      if (!template) return;

      const newWS = await createProject(userId, { 
        name: wsName, 
        code: '', 
        template: template.id, 
        type: template.id === 'erc721' ? 'ERC721' : 'ERC20' 
      });

      const newFile = await createFile(userId, newWS.id, fName, template.code);
      const wsWithFile = { ...newWS, files: [newFile] };

      setProjects([wsWithFile, ...projects]);
      setCurrentProject(wsWithFile);
      setActiveFileId(newFile.id);
      setCode(newFile.content);
      setShowWorkspaceModal(false);
    } catch (e) {
      console.error('Failed to create workspace:', e);
    }
  };

  const handleSelectFile = async (projectId: string, file: ContractFile) => {
     setActiveFileId(file.id);
     setCode(file.content);
     const project = projects.find(p => p.id === projectId);
     if (project) setCurrentProject(project);
  };

  const handleAddFile = async (workspaceId: string) => {
    const name = prompt('Contract name?', 'NewContract.sol');
    if (!name) return;
    const finalName = name.endsWith('.sol') ? name : `${name}.sol`;
    
    try {
      const file = await createFile(userId, workspaceId, finalName, '// New Contract');
      setProjects(projects.map(p => p.id === workspaceId ? { ...p, files: [...(p.files || []), file] } : p));
      setActiveFileId(file.id);
      setCode(file.content);
    } catch (e) { console.error('Failed to add file:', e); }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Delete this contract file?')) return;
    try {
      await deleteFile(fileId);
      setProjects(projects.map(p => ({
        ...p,
        files: p.files?.filter((f: ContractFile) => f.id !== fileId)
      })));
      if (activeFileId === fileId) {
        setActiveFileId(undefined);
        setCode('');
      }
    } catch (e) { console.error('Failed to delete file:', e); }
  };

  const handlePreviewContract = async (codeContent: string, _type: string) => {
    let targetProject = currentProject;
    
    // 1. Auto-initialize a project if none exists
    if (!targetProject) {
      try {
        const newProject = await createProject(userId, { 
          name: 'Generated Assets', 
          code: '', 
          template: 'erc20', 
          type: 'ERC20' 
        });
        const updatedProjects = [newProject, ...projects];
        setProjects(updatedProjects);
        setCurrentProject(newProject);
        targetProject = newProject;
      } catch (e) {
        console.error('Failed to auto-create project:', e);
        return;
      }
    }
    
    const draftName = 'FactoryDraft.sol';
    const existingDraft = targetProject.files?.find(f => f.name === draftName);

    try {
      if (existingDraft) {
        await updateFile(existingDraft.id, codeContent);
        
        // Update the projects list with new content for this file
        setProjects(prevProjects => prevProjects.map(p => 
          p.id === targetProject!.id 
            ? { ...p, files: p.files?.map(f => f.id === existingDraft.id ? { ...f, content: codeContent } : f) } 
            : p
        ));

        // Sync current code if this is active
        if (activeFileId === existingDraft.id) {
          setCode(codeContent);
        } else {
          setActiveFileId(existingDraft.id);
          setCode(codeContent);
        }
      } else {
        const file = await createFile(userId, targetProject.id, draftName, codeContent);
        const updatedProject = { ...targetProject, files: [...(targetProject.files || []), file] };
        
        setProjects(prevProjects => prevProjects.map(p => p.id === targetProject!.id ? updatedProject : p));
        setCurrentProject(updatedProject);
        setActiveFileId(file.id);
        setCode(file.content);
      }
    } catch (e) {
      console.error('Failed to preview contract:', e);
    }
  };

  const handleInjectContract = async (codeContent: string, type: string) => {
    if (!currentProject) {
      alert('Please select or create a workspace first.');
      return;
    }
    const name = `${type}_${Date.now()}.sol`;
    try {
      // 1. Create the permanent file
      const file = await createFile(userId, currentProject.id, name, codeContent);
      
      // 2. Check for and remove the draft if it exists
      const draftFile = currentProject.files?.find(f => f.name === 'FactoryDraft.sol');
      const updatedProject = { ...currentProject, files: [...(currentProject.files || []), file] };
      
      if (draftFile) {
        await deleteFile(draftFile.id);
        updatedProject.files = updatedProject.files.filter(f => f.id !== draftFile.id);
      }

      setProjects(prevProjects => prevProjects.map(p => p.id === currentProject!.id ? updatedProject : p));
      setCurrentProject(updatedProject);
      setActiveFileId(file.id);
      setCode(file.content);
      setActiveActivity('explorer');
    } catch (e) {
      console.error('Failed to inject contract:', e);
    }
  };

  const handleAIQuery = (prompt: string) => {
    setAiPromptOverride({ prompt, theme: "Gas Optimization" });
    setActiveRightActivity('ai');
    setShowRightSidebar(true);
  };

  const handleTransactionExecuted = async (txHash: string) => {
    if (!compileResult || !compileResult.sourceMap) return;
    
    setIsProfiling(true);
    setActiveRightActivity('profiler');
    setShowRightSidebar(true);
    
    try {
      const trace = await browserVM.getTransactionTrace(txHash);
      if (trace) {
        const sourceMap = parseSourceMap(compileResult.sourceMap);
        const map = mapTraceToLines(trace, sourceMap, code);
        setProfilerData({
          lineGasMap: map,
          totalGas: trace.gas || 0
        });
      }
    } catch (e) {
      console.error("Failed to map trace", e);
    } finally {
      setIsProfiling(false);
    }
  };

  const handlePromoteContract = async () => {
    if (!isConnected || !signer) {
      alert("Please connect a Wallet (MetaMask) to promote to a live network.");
      return;
    }
    if (!compileResult || !compileResult.bytecode) {
      alert("Please ensure your code is compiled successfully.");
      return;
    }

    const confirmDeploy = window.confirm(
      "WARNING: You are about to deploy this contract to a live network via MetaMask.\n\n" +
      "• Gas prices will be real and subject to network volatility.\n" +
      "• Line-by-Line Gas Heatmaps are disabled for Promoted contracts due to public node limits.\n\n" +
      "Are you sure you want to promote this contract?"
    );
    if (!confirmDeploy) return;

    try {
      const factory = new ethers.ContractFactory(compileResult.abi as any, compileResult.bytecode, signer);
      const deployTx = await factory.deploy();
      
      const receipt = await deployTx.deploymentTransaction()?.wait();
      const realAddress = await deployTx.getAddress();
      
      const promotedEntry: SimulatedDeployment = {
        network: networkName || 'Unknown Network',
        transactionHash: receipt?.hash || '',
        contractAddress: realAddress,
        status: 'confirmed',
        gasUsed: Number(receipt?.gasUsed || 0n),
        deployer: account || '',
        timestamp: new Date().toISOString(),
        blockNumber: receipt?.blockNumber || 0,
        isRealChain: true
      };

      addSimulation(promotedEntry);
    } catch (e: any) {
      console.error('Promotion to MetaMask Failed:', e);
      alert("Failed to promote: " + (e.reason || e.message || String(e)));
    }
  };

  const handleBeforeIdentityLink = async () => {
    if (activeFileId && code) {
      await updateFile(activeFileId, code);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] selection:bg-blue-500/30 overflow-hidden font-sans relative">
      
      {!(window as any).ethereum && (
        <div className="bg-red-900/40 border-b border-red-500/30 px-4 py-1.5 flex items-center justify-center gap-2 z-[70] shrink-0">
          <Terminal className="h-3.5 w-3.5 text-red-400" />
          <span className="text-xs text-red-200 font-medium">
            MetaMask not detected. Live deployment and network promotion features are currently disabled.
          </span>
          <a href="https://metamask.io" target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline ml-2">
            Install MetaMask
          </a>
        </div>
      )}

      {/* 🚀 Header */}
      <header className="h-9 border-b border-[#2d2d2d] bg-[#2d2d2d] flex items-center px-3 justify-between shrink-0 select-none z-[60]">
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2">
              <div className="bg-[#007acc] p-0.5 rounded">
                <Code2 className="size-3.5 text-white" />
              </div>
              <span className="text-[11px] font-black tracking-tighter text-white uppercase italic">Crypt<span className="text-[#007acc]">P</span> <span className="opacity-40 font-normal ml-1">IDE</span></span>
           </div>
           <div className="h-3 w-[1px] bg-[#444] mx-1"></div>
           <span className="text-[10px] text-gray-400 font-bold truncate max-w-[200px]">
             {currentProject?.name || 'Loading...'} <span className="mx-1 opacity-20">•</span> {projects.find(p => p.id === currentProject?.id)?.files?.find((f: ContractFile) => f.id === activeFileId)?.name || 'Untitled.sol'}
           </span>
        </div>
        <div className="flex items-center gap-2">
           {compileResult?.success && (
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full">
                <Check className="size-2.5 text-green-500" />
                <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">Ready</span>
             </div>
           )}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-full" title="Compiler: Browser-Native (WASM)">
               <div className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
               <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">WASM</span>
            </div>
           <button onClick={() => { setGithubModalTab(undefined); setShowGitHubModal(true); }} className="p-1 hover:bg-[#3d3d3d] rounded text-gray-400 hover:text-white transition-colors" title="GitHub Sync">
             <Github className="size-4" />
           </button>
           <div className="scale-75 origin-right">
             <WalletConnect />
           </div>
           <button onClick={handleSignOut} className="px-2 py-1 text-[9px] font-black text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest">Exit</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        
        {/* 🛠️ Standalone Activity Bar */}
        <aside className="w-12 bg-[#333333] border-r border-[#1e1e1e] flex flex-col items-center py-2 shrink-0 z-50">
          <ActivityIcon active={activeActivity === 'explorer'} onClick={() => { setActiveActivity('explorer'); setShowSideBar(true); }} icon={<FolderTree className="size-5" />} label="Explorer" />
          <ActivityIcon active={activeActivity === 'search'} onClick={() => { setActiveActivity('search'); setShowSideBar(true); }} icon={<Search className="size-5" />} label="Search" />
          <ActivityIcon active={activeActivity === 'factory'} onClick={() => { setActiveActivity('factory'); setShowSideBar(true); }} icon={<Zap className="size-5" />} label="Token Factory" />
          <ActivityIcon active={activeActivity === 'chain'} onClick={() => { setActiveActivity('chain'); setShowSideBar(true); }} icon={<LayoutGrid className="size-5" />} label="History" />
          <ActivityIcon active={activeActivity === 'interact'} onClick={() => { setActiveActivity('interact'); setShowSideBar(true); }} icon={<Play className="size-5" />} label="Interaction" />
          <ActivityIcon active={activeActivity === 'analytics'} onClick={() => { setActiveActivity('analytics'); setShowSideBar(true); }} icon={<BarChart3 className="size-5" />} label="Analytics" />
          <div className="flex-1"></div>
          <ActivityIcon active={showRightSidebar && activeRightActivity === 'profiler'} onClick={() => { setActiveRightActivity('profiler'); setShowRightSidebar(true); }} icon={<Flame className="size-5 text-orange-500" />} label="Gas Profiler" />
          <ActivityIcon active={showRightSidebar && activeRightActivity === 'ai'} onClick={() => { setActiveRightActivity('ai'); setShowRightSidebar(true); }} icon={<Bug className="size-5 text-blue-400" />} label="AI Assistant" />
          <ActivityIcon active={activeActivity === 'docs'} onClick={() => { setActiveActivity('docs'); setShowSideBar(true); }} icon={<BookOpen className="size-5" />} label="Integrations" />
          <ActivityIcon active={showRightSidebar && activeRightActivity === 'settings'} onClick={() => { setActiveRightActivity('settings'); setShowRightSidebar(true); }} icon={<Settings className="size-5" />} label="Settings" />
        </aside>

        {/* 📂 Primary Sidebar (Left) */}
        {showSideBar && (
          <>
            <aside style={{ width: `${sidebarWidth}px` }} className="bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0 z-40 relative group">
              <div className="px-5 py-3 border-b border-[#2d2d2d] bg-[#252526]/50">
                 <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#858585] whitespace-nowrap">
                   {activeActivity === 'explorer' && 'Workspace'}
                   {activeActivity === 'search' && 'Search'}
                   {activeActivity === 'factory' && 'Asset Factory'}
                   {activeActivity === 'chain' && 'History'}
                   {activeActivity === 'interact' && 'Deployment'}
                   {activeActivity === 'analytics' && 'Analytics'}
                   {activeActivity === 'docs' && 'Documentation'}
                 </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeActivity === 'explorer' && (
                  <ProjectExplorer 
                    projects={projects} 
                    currentProjectId={currentProject?.id}
                    activeFileId={activeFileId}
                    onSelectProject={setCurrentProject}
                    onCreateProject={() => setShowWorkspaceModal(true)} 
                    onSelectFile={handleSelectFile}
                    onAddFile={handleAddFile}
                    onDeleteFile={handleDeleteFile}
                    onDeleteProject={handleDeleteProject} 
                  />
                )}
                {activeActivity === 'factory' && (
                  <TokenFactory 
                    onInjectCode={handleInjectContract} 
                    onPreview={handlePreviewContract}
                  />
                )}
                {activeActivity === 'chain' && <SimulatedChain deployments={simulations} onReset={() => setShowResetConfirm(true)} onPromote={handlePromoteContract} onInteract={(d) => { setActiveDeployment({ address: d.contractAddress, abi: d.abi || compileResult?.abi || [], network: d.network }); setActiveActivity('interact'); }} />}
                {activeActivity === 'interact' && activeDeployment ? (
                  <ContractInteraction 
                    abi={activeDeployment.abi} 
                    address={activeDeployment.address} 
                    network={activeDeployment.network} 
                    onRefreshSimulations={() => {}} 
                    onTransactionExecuted={handleTransactionExecuted}
                    onQueryAI={handleAIQuery}
                  />
                ) : activeActivity === 'interact' && (
                  <div className="p-8 text-center opacity-20">
                    <Play className="size-8 mx-auto mb-2" />
                    <p className="text-xs italic">No active deployment.</p>
                  </div>
                )}
                {activeActivity === 'analytics' && <AnalyticsSidebar compileResult={compileResult || undefined} sourceCode={code} securityReport={securityReport} />}
                {activeActivity === 'docs' && <DocsSidebar />}
                {activeActivity === 'search' && (
                  <TokenSearch 
                    projects={projects} 
                    onSelectResult={(projectId, fileId) => {
                      const proj = projects.find(p => p.id === projectId);
                      if (proj) {
                        setCurrentProject(proj);
                        const file = proj.files?.find((f: ContractFile) => f.id === fileId);
                        if (file) handleSelectFile(projectId, file);
                      }
                    }} 
                  />
                )}
              </div>
            </aside>
            <div onMouseDown={startResizingSidebar} className={`w-[1px] hover:w-[3px] bg-[#1e1e1e] hover:bg-[#007acc] cursor-col-resize transition-all z-50 shrink-0 ${isResizingSidebar ? 'bg-[#007acc] !w-[3px]' : ''}`} />
          </>
        )}

        {/* 💻 Center Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#1e1e1e]">
          <div className="h-9 bg-[#252526] border-b border-[#2d2d2d] flex items-center px-4 gap-2 justify-between shrink-0 z-30">
             <div className="flex items-center gap-2 text-[11px] text-[#858585]">
                <FolderOpen className="size-3.5" />
                <span>workspace</span>
                <span className="opacity-20">/</span>
                <FileCode className="size-3.5 text-[#007acc]" />
                <span className="text-[#cccccc]">
                  {projects.find(p => p.id === currentProject?.id)?.files?.find((f: ContractFile) => f.id === activeFileId)?.name || 'Untitled.sol'}
                </span>
             </div>
             <button onClick={() => setShowBottomPanel(!showBottomPanel)} className={`p-1.5 transition-colors rounded ${showBottomPanel ? 'text-[#007acc] bg-[#2d2d2d]' : 'text-[#858585] hover:text-[#cccccc]'}`}><Terminal className="size-4" /></button>
          </div>

          <div className="flex-1 overflow-hidden">
            <SolidityEditor 
              code={code} 
              activeFileName={projects.find(p => p.id === currentProject?.id)?.files?.find((f: ContractFile) => f.id === activeFileId)?.name || ''}
              compileResult={compileResult} 
              isCompiling={isCompiling} 
              onCodeChange={setCode} 
              onCompile={triggerCompile}
              onNewDeployment={addSimulation} 
              securityReport={securityReport} 
              isScanning={isScanning} 
              projectFiles={projects.find(p => p.id === currentProject?.id)?.files?.map((f: ContractFile) => ({ name: f.name, content: f.content }))}
            />
          </div>

          {/* 📠 Bottom Panel */}
          {showBottomPanel && (
            <>
              <div onMouseDown={startResizingBottomPanel} className={`h-[1px] hover:h-[3px] bg-[#2d2d2d] hover:bg-[#007acc] cursor-row-resize transition-all z-50 shrink-0 ${isResizingBottomPanel ? 'bg-[#007acc] !h-[3px]' : ''}`} />
              <div style={{ height: `${bottomPanelHeight}px` }} className="bg-[#1e1e1e] border-t border-[#2d2d2d] flex flex-col overflow-hidden z-30">
                 <div className="flex bg-[#252526] border-b border-[#2d2d2d] shrink-0">
                    <button onClick={() => setActiveBottomTab('output')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-t-2 transition-all ${activeBottomTab === 'output' ? 'text-white border-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] border-transparent hover:text-white'}`}>Output</button>
                    <button onClick={() => setActiveBottomTab('security')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-t-2 transition-all ${activeBottomTab === 'security' ? 'text-white border-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] border-transparent hover:text-white'}`}>Problem Audit</button>
                    <div className="flex-1"></div>
                    <button onClick={() => setShowBottomPanel(false)} className="p-2 text-[#858585] hover:text-white"><ChevronLeft className="size-4 rotate-[-90deg]" /></button>
                 </div>
                 <div className="flex-1 overflow-auto custom-scrollbar">
                    {activeBottomTab === 'output' && compileResult && <div className="p-4"><CompileOutput result={compileResult} code={code} onDeployment={addSimulation} /></div>}
                    {activeBottomTab === 'security' && <SecurityAudit report={securityReport} isScanning={isScanning} hasCompileError={compileResult?.success === false} />}
                 </div>
              </div>
            </>
          )}
        </div>

        {/* 🤖 Secondary Sidebar (Right) - AI Assistant */}
        {showRightSidebar && (
          <>
            <div onMouseDown={startResizingRightSidebar} className={`w-[1px] hover:w-[3px] bg-[#1e1e1e] hover:bg-[#007acc] cursor-col-resize transition-all z-50 shrink-0 ${isResizingRightSidebar ? 'bg-[#007acc] !w-[3px]' : ''}`} />
            <aside style={{ width: `${rightSidebarWidth}px` }} className="bg-[#252526] border-l border-[#1e1e1e] flex flex-col shrink-0 z-40 relative h-full">
              {activeRightActivity === 'ai' && (
                <AIChat 
                  user={userProfile}
                  currentProject={currentProject}
                  activeFileId={activeFileId}
                  activeFileCode={code}
                  onUpdateCode={setCode}
                  onCompile={triggerCompile}
                  onDeploy={triggerAIDeploy}
                  compileResult={compileResult}
                  securityReport={securityReport}
                  initialPrompt={aiPromptOverride}
                  onPromptConsumed={() => setAiPromptOverride(null)}
                  onCreateFile={async (name, content) => {
                    if (!currentProject) return;
                    try {
                      const finalName = name.endsWith('.sol') ? name : `${name}.sol`;
                      const file = await createFile(userId, currentProject.id, finalName, content);
                      setProjects(projects.map(p => p.id === currentProject.id ? { ...p, files: [...(p.files || []), file] } : p));
                      setActiveFileId(file.id);
                      setCode(file.content);
                    } catch (e) { console.error('AI created file failed:', e); }
                  }}
                />
              )}
              {activeRightActivity === 'profiler' && <GasProfiler lineGasMap={profilerData.lineGasMap} totalGas={profilerData.totalGas} isProfiling={isProfiling} />}
              {activeRightActivity === 'settings' && <SettingsSidebar user={userProfile} onSignOut={handleSignOut} onBeforeIdentityLink={handleBeforeIdentityLink} />}
            </aside>
          </>
        )}
      </div>

      {/* 🧭 Status Bar */}
      <footer className={`h-6 flex items-center px-1 justify-between shrink-0 select-none z-[60] transition-colors duration-500 ${isConnected ? 'bg-[#007acc]' : 'bg-[#e51400]'}`}>
        <div className="flex items-center gap-3 px-3">
           <div className="flex items-center gap-1.5 cursor-pointer hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors" onClick={() => !isConnected && connect()}>
             {isConnected ? <Wallet className="size-3" /> : <Info className="size-3 animate-pulse" />}
             <span className="text-[10px] font-bold">
               {isConnected 
                 ? `${account?.slice(0, 6)}...${account?.slice(-4)} (${networkName})` 
                 : isConnecting ? 'Connecting...' : 'Wallet Disconnected'
               }
             </span>
           </div>
           {isConnected && (
             <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-white/10 rounded">
                <span className="text-[10px] font-bold text-white/90">{balance} ETH</span>
             </div>
           )}
        </div>
        <div className="flex items-center gap-3 px-3">
           <div className="flex items-center gap-1.5"><Bug className="size-3" /><span className="text-[10px] font-bold">AI Active</span></div>
           <div className="flex items-center gap-1.5"><Check className="size-3" /><span className="text-[10px] font-bold">Live Sync</span></div>
        </div>
      </footer>

      {/* 🛑 Modals */}
      {showWorkspaceModal && <NewWorkspaceModal onClose={() => setShowWorkspaceModal(false)} onCreate={handleCreateWorkspace} onOpenGitHubImport={() => {
          setShowWorkspaceModal(false);
          setGithubModalTab('import');
          setShowGitHubModal(true);
      }} />}
      {showGitHubModal && <GitHubSyncModal isOpen={showGitHubModal} initialTab={githubModalInitialTab} onClose={() => setShowGitHubModal(false)} userId={userId} currentProject={currentProject} onWorkspaceCreated={(p) => { setProjects([p, ...projects]); setCurrentProject(p); setShowGitHubModal(false); }} />}
      {showLinkIdentityModal && <LinkIdentityModal onClose={() => setShowLinkIdentityModal(false)} />}
      
      {showResetConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-red-500/30 rounded-xl p-6 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-lg font-bold text-red-400 mb-2">Reset Chain?</h3>
            <p className="text-[#858585] text-sm mb-6">Permanently delete transaction history.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-4 py-2 bg-[#2d2d2d] rounded-lg">Cancel</button>
              <button onClick={handleResetChain} className="flex-1 px-4 py-2 bg-red-600 rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ActivityIconProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const ActivityIcon: React.FC<ActivityIconProps> = ({ active, onClick, icon, label }) => (
  <div className="relative group w-full flex justify-center py-1.5">
    {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-8 bg-white z-50 rounded-r" />}
    <button onClick={onClick} className={`p-2 transition-all ${active ? 'text-white' : 'text-[#858585] hover:text-white'}`}>{icon}</button>
    <div className="absolute left-full ml-2 px-2 py-1 bg-[#252526] border border-[#454545] text-white text-[10px] font-medium rounded shadow-2xl opacity-0 group-hover:opacity-100 translate-x-1 pointer-events-none transition-all z-[100] whitespace-nowrap top-1/2 -translate-y-1/2">
      {label}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-[#252526] border-l border-b border-[#454545] rotate-45" />
    </div>
  </div>
);

export default IDELayout;
