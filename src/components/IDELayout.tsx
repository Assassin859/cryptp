import React, { useState, useEffect, useRef } from 'react';
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
  updateProject,
  Project,
  saveCompilation,
  getLatestCompilation,
  saveDeployment,
  getDeployments,
  deleteDeployments,
  computeContentHash,
  saveGasProfile,
  deploymentToSimulation,
  type SaveDeploymentPayload,
  type DeploymentKind,
} from '../utils/userData';
import { rehydrateSandboxFromDb } from '../utils/sandboxRehydrate';
import { parseConstructorArgsFromAbi } from '../utils/constructorArgs';
import { compileWithHardhat, CompilationResult } from '../utils/hardhatCompiler';
import { allTemplates, simpleStorageTemplate } from '../utils/contractTemplates';
import { SimulatedDeployment } from '../types';
import SolidityEditor from './SolidityEditor';
import DeploymentGuide from './DeploymentGuide';
import SimulatedChain from './SimulatedChain';
import ProjectExplorer from './ProjectExplorer';
import ContractInteraction from './ContractInteraction';
import TokenFactory from './TokenFactory';
import CompileOutput from './CompileOutput';
import TokenSearch from './TokenSearch';
import SecurityAudit from './SecurityAudit';
import NewWorkspaceModal from './NewWorkspaceModal';
import AddFileModal from './AddFileModal';
import { GitHubSyncModal } from './GitHubSyncModal';
import LinkIdentityModal from './LinkIdentityModal';
import SettingsSidebar from './SettingsSidebar';
import GasProfiler from './GasProfiler';
import DocsSidebar from './DocsSidebar';
import ConfirmModal from './ConfirmModal';
import InputModal from './InputModal';
import AethonTerminal from './AethonTerminal';

const AIChat = React.lazy(() => import('./AIChat'));
const AnalyticsSidebar = React.lazy(() => import('./AnalyticsSidebar'));
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

  // Mobile-safe initial layouts
  const isMobileInitial = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  const [activeActivity, setActiveActivity] = useState<'explorer' | 'factory' | 'interact' | 'chain' | 'docs' | 'search' | 'analytics'>('explorer');
  const [activeRightActivity, setActiveRightActivity] = useState<'ai' | 'profiler' | 'settings'>(isNewUser ? 'settings' : 'ai');
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [showSideBar, setShowSideBar] = useState(!isMobileInitial);
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [profilerData, setProfilerData] = useState<{ lineGasMap: Map<number, number>, totalGas: number, quality: import('../utils/traceMapper').HeatmapQuality, unmappedGas: number, traceTree?: import('../utils/browserVM').CallFrame }>({ lineGasMap: new Map(), totalGas: 0, quality: 'accurate', unmappedGas: 0 });
  const [isProfiling, setIsProfiling] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const [showRightSidebar, setShowRightSidebar] = useState(!isMobileInitial);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(300);
  const [isResizingRightSidebar, setIsResizingRightSidebar] = useState(false);

  const [showBottomPanel, setShowBottomPanel] = useState(!isMobileInitial);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(200);
  const [isResizingBottomPanel, setIsResizingBottomPanel] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'output' | 'security' | 'terminal'>('output');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  
  const [code, setCode] = useState<string>('');
  const [compileResult, setCompileResult] = useState<CompilationResult | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [securityReport, setSecurityReport] = useState<SecurityReport | null>(null);
  const [hasCompiledInSession, setHasCompiledInSession] = useState(false);
  const [aiPromptOverride, setAiPromptOverride] = useState<{prompt: string, theme: string} | null>(null);
  const [activeCompileDeployment, setActiveCompileDeployment] = useState<SimulatedDeployment | null>(null);

  const [simulations, setSimulations] = useState<SimulatedDeployment[]>([]);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ─── Modal State (replaces window.confirm / window.prompt) ───────────────
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; confirmLabel?: string;
    isDangerous?: boolean; onConfirm: () => void;
  } | null>(null);
  const [inputModal, setInputModal] = useState<{
    title: string; label: string; placeholder?: string;
    defaultValue?: string; onConfirm: (value: string) => void;
  } | null>(null);
  // ─────────────────────────────────────────────────────────────────────────
  
  const [activeFileId, setActiveFileId] = useState<string | undefined>(undefined);
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [addFileContext, setAddFileContext] = useState<{ workspaceId: string, parentPath?: string } | null>(null);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [showLinkIdentityModal, setShowLinkIdentityModal] = useState(false);
  const [githubModalInitialTab, setGithubModalTab] = useState<'import' | 'export' | 'sync' | undefined>(undefined);
  
  const fileStateCache = useRef<Record<string, {
      compileResult: CompilationResult | null;
      securityReport: SecurityReport | null;
      simulations: SimulatedDeployment[];
      hasCompiledInSession: boolean;
      activeCompileDeployment: SimulatedDeployment | null;
      lastCompiledSource: string | null;
  }>>({});
  const switchingFileRef = useRef(false);
  const rehydrateInFlight = useRef(false);
  const lastCompilationId = useRef<string | null>(null);
  const lastCompiledSourceRef = useRef<string | null>(null);
  const prevCodeByFileRef = useRef<Record<string, string>>({});

  const [activeDeployment, setActiveDeployment] = useState<{address: string, abi: any, network: string} | null>(null);
  const [compilerVersion, setCompilerVersion] = useState<string>('0.8.20');
  const [versionNotification, setVersionNotification] = useState<{message: string, type: 'info' | 'success'} | null>(null);

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

  // Collapse all panels when viewport shrinks below mobile breakpoint
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setShowSideBar(false);
        setShowRightSidebar(false);
        setShowBottomPanel(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

        let userProjects = await getProjects(userId);

        // Track whether we just created a fresh workspace for this session
        let didCreateStarterWorkspace = false;

        if (userProjects.length === 0) {
          // 🚀 No projects found — auto-create a starter workspace (first-time users only)
          const defaultWS = await createProject(userId, {
            name: 'Welcome Workspace',
            code: '',
            template: 'simple-storage',
            type: 'SimpleStorage'
          });

          const defaultFile = await createFile(
            userId,
            defaultWS.id,
            'SimpleStorage.sol',
            simpleStorageTemplate.code
          );

          defaultWS.files = [defaultFile];
          userProjects = [defaultWS];
          didCreateStarterWorkspace = true;
        }

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
          
          let activeCode = '';
          if (mostRecent.files && mostRecent.files.length > 0) {
            const activeFile = mostRecent.files.find(f => f.id === mostRecent.active_file_id) || mostRecent.files[0];
            setActiveFileId(activeFile.id);
            setCode(activeFile.content);
            activeCode = activeFile.content;
          }

          // ✅ Bootstrap: only auto-compile/deploy for brand-new workspaces, not returning users
          if (didCreateStarterWorkspace) {
            // compileWithHardhat is statically imported at the top
            const activeFileName = mostRecent.files?.[0]?.name || 'SimpleStorage.sol';
            const projectFilesMap = mostRecent.files?.map(f => ({ name: f.name, content: f.content }));
            
            const result = await compileWithHardhat(activeCode, undefined, projectFilesMap, compilerVersion, undefined, activeFileName);
            setCompileResult(result);

            if (result && result.success && result.bytecode) {
              setHasCompiledInSession(true);
              const activeFile = mostRecent.files?.find(f => f.id === mostRecent.active_file_id) || mostRecent.files?.[0];
              const contentHash = await computeContentHash(activeCode);
              const report = scanContract(activeCode);
              setSecurityReport(report);
              const savedCompilation = await saveCompilation(userId, mostRecent.id, result, {
                fileId: activeFile?.id,
                contentHash,
                securityReport: report,
              });
              lastCompilationId.current = savedCompilation.id;

              const deployResult = await browserVM.deployContract(result.bytecode);
              const deploySimulation: SimulatedDeployment = {
                network: 'Local Simulation',
                transactionHash: deployResult.transactionHash,
                contractAddress: deployResult.contractAddress,
                status: 'confirmed',
                gasUsed: deployResult.gasUsed,
                deployer: browserVM.getActiveAccount(),
                timestamp: new Date().toISOString(),
                blockNumber: await browserVM.getBlockNumber(),
                isRealChain: false
              };

              await saveDeployment(userId, mostRecent.id, {
                simulated_chain: deploySimulation,
                network: deploySimulation.network,
                tx_hash: deploySimulation.transactionHash,
                contract_address: deploySimulation.contractAddress,
                status: deploySimulation.status,
                gas_used: deploySimulation.gasUsed,
                deployer: deploySimulation.deployer,
                abi: result.abi || [],
                file_id: activeFile?.id,
                compilation_id: savedCompilation.id,
                bytecode: result.bytecode,
                constructor_args: [],
                deployment_kind: 'deploy',
                gas_limit: deployResult.gasUsed,
              });

              setSimulations([deploySimulation]);
              setActiveDeployment({ address: deploySimulation.contractAddress, abi: result.abi || [], network: deploySimulation.network });

              // Generate an execution transaction to populate the Gas Profiler (e.g. setValue(100))
              try {
                const iface = new ethers.Interface(result.abi as any);
                const txData = iface.encodeFunctionData('setValue', [100n]);
                const txResult = await browserVM.sendTransaction(deployResult.contractAddress, txData);

                const execSimulation: SimulatedDeployment = {
                  network: 'Local Simulation',
                  transactionHash: txResult.transactionHash,
                  contractAddress: deployResult.contractAddress,
                  status: 'confirmed',
                  gasUsed: txResult.gasUsed,
                  deployer: browserVM.getActiveAccount(),
                  timestamp: new Date().toISOString(),
                  blockNumber: await browserVM.getBlockNumber(),
                  isRealChain: false
                };

                // Save the execution transaction in deployments
                await saveDeployment(userId, mostRecent.id, {
                  simulated_chain: execSimulation,
                  network: execSimulation.network,
                  tx_hash: execSimulation.transactionHash,
                  contract_address: execSimulation.contractAddress,
                  status: execSimulation.status,
                  gas_used: execSimulation.gasUsed,
                  deployer: execSimulation.deployer,
                  abi: result.abi || [],
                  file_id: activeFile?.id,
                  compilation_id: savedCompilation.id,
                  call_data: txData,
                  call_value_wei: '0',
                  gas_limit: txResult.gasUsed,
                  deployment_kind: 'execute',
                });

                setSimulations([execSimulation, deploySimulation]);

                // Run Gas Profiler on this executed transaction trace immediately!
                const trace = await browserVM.getTransactionTrace(txResult.transactionHash);
                if (trace) {
                  const sourceMap = parseSourceMap(result.sourceMap || '');
                  const traceResult = mapTraceToLines(
                    trace,
                    sourceMap,
                    activeCode,
                    result.bytecode,
                    browserVM.getTraceDepthFilter()
                  );
                  setProfilerData({
                    lineGasMap: traceResult.lineGasMap,
                    totalGas: traceResult.totalTracedGas || trace.gas || 0,
                    quality: traceResult.quality,
                    unmappedGas: traceResult.unmappedGas,
                    traceTree: trace.traceTree,
                  });
                }

                // Show Right Sidebar and switch to Gas Profiler by default
                setActiveRightActivity('profiler');
                if (!isMobileInitial) setShowRightSidebar(true);
              } catch (txErr) {
                console.error("Failed to run starter tx:", txErr);
              }

              if (!isMobileInitial) {
                setShowBottomPanel(true);
                setActiveBottomTab('output');
              }
            }
          }
        }
      } catch (error) { console.error('Failed to load user data:', error); } finally { setIsLoadingProjects(false); }
    };
    loadUserData();
  }, [userId]);

  // Load deployments + rehydrate sandbox when project changes
  useEffect(() => {
    if (!currentProject || !userId) return;

    const loadAndRehydrate = async () => {
      if (rehydrateInFlight.current) return;
      rehydrateInFlight.current = true;
      try {
        const { simulations: rehydrated, profilerData: restoredProfiler, errors } =
          await rehydrateSandboxFromDb(userId, currentProject.id);

        if (errors.length > 0) {
          console.warn('[Sandbox] Rehydrate partial failures:', errors);
        }

        setSimulations(rehydrated);

        const latestDeploy = rehydrated.find(
          (s) => s.network === 'Local Simulation' && !s.isRealChain
        );
        if (latestDeploy) {
          setActiveDeployment({
            address: latestDeploy.contractAddress,
            abi: latestDeploy.abi || compileResult?.abi || [],
            network: latestDeploy.network,
          });
        } else if (rehydrated.length > 0) {
          const latest = rehydrated[0];
          setActiveDeployment({
            address: latest.contractAddress,
            abi: latest.abi || [],
            network: latest.network,
          });
        } else {
          setActiveDeployment(null);
        }

        if (restoredProfiler) {
          setProfilerData((prev) => ({
            ...prev,
            lineGasMap: restoredProfiler.lineGasMap,
            totalGas: restoredProfiler.totalGas,
            quality: restoredProfiler.quality,
            unmappedGas: restoredProfiler.unmappedGas,
          }));
        }
      } catch (e) {
        console.error('Failed to load/rehydrate deployments:', e);
        try {
          const savedDeployments = await getDeployments(userId, currentProject.id);
          setSimulations(savedDeployments.map((d) => deploymentToSimulation(d)));
        } catch (fallbackErr) {
          console.error('Fallback deployment load failed:', fallbackErr);
        }
      } finally {
        rehydrateInFlight.current = false;
      }
    };

    loadAndRehydrate();
  }, [currentProject?.id, userId]);

  // Restore latest compilation + security report for active file
  useEffect(() => {
    if (!currentProject || !userId || !activeFileId || isLoadingProjects) return;

    const restoreCompilation = async () => {
      try {
        if (currentProject.compiler_version) {
          setCompilerVersion(currentProject.compiler_version);
        }
        const latest = await getLatestCompilation(userId, currentProject.id, activeFileId);
        if (!latest?.result?.success) return;

        const hash = await computeContentHash(code);
        if (latest.content_hash && latest.content_hash !== hash) {
          setCompileResult(null);
          setSecurityReport(null);
          setHasCompiledInSession(false);
          lastCompiledSourceRef.current = null;
          return;
        }

        lastCompilationId.current = latest.id;
        setCompileResult(latest.result);
        setSecurityReport(latest.security_report ?? null);
        setHasCompiledInSession(true);
        lastCompiledSourceRef.current = code;
      } catch (e) {
        console.error('Failed to restore compilation:', e);
      }
    };

    restoreCompilation();
  }, [activeFileId, currentProject?.id, userId, isLoadingProjects, code]);

  // Sync activeDeployment ABI with compilation result if activeDeployment lacks ABI
  useEffect(() => {
    if (
      compileResult?.success &&
      compileResult.abi &&
      compileResult.abi.length > 0 &&
      activeDeployment &&
      (!activeDeployment.abi || activeDeployment.abi.length === 0)
    ) {
      setActiveDeployment((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          abi: compileResult.abi,
        };
      });
    }
  }, [compileResult, activeDeployment]);

  useEffect(() => {
    if (code === undefined || isLoadingProjects || !activeFileId) return;
    const saveCode = async () => { 
      if (activeFileId) {
         await updateFile(activeFileId, code);
         setProjects(prev => prev.map(p => {
           if (p.id !== currentProject?.id) return p;
           return { ...p, files: p.files?.map(f => f.id === activeFileId ? { ...f, content: code } : f) };
         }));
      }
    };
    
    if (switchingFileRef.current) {
        switchingFileRef.current = false;
        const cached = fileStateCache.current[activeFileId];
        if (cached) {
            setCompileResult(cached.compileResult);
            setSecurityReport(cached.securityReport);
            setSimulations(cached.simulations);
            setHasCompiledInSession(cached.hasCompiledInSession);
            setActiveCompileDeployment(cached.activeCompileDeployment || null);
            lastCompiledSourceRef.current = cached.lastCompiledSource ?? null;
        } else {
            setCompileResult(null);
            setSecurityReport(null);
            setSimulations([]);
            setHasCompiledInSession(false);
            setActiveCompileDeployment(null);
            lastCompiledSourceRef.current = null;
        }
        return;
    }

    const prevCode = prevCodeByFileRef.current[activeFileId];
    const isUserEdit = prevCode !== undefined && prevCode !== code;
    prevCodeByFileRef.current[activeFileId] = code;

    if (isUserEdit) {
      setHasCompiledInSession(false);
      setActiveCompileDeployment(null);
      setActiveDeployment(null);
    }
    
    const timeoutId = setTimeout(saveCode, 1000);
    return () => clearTimeout(timeoutId);
  }, [code, activeFileId, isLoadingProjects]);

  useEffect(() => {
    if (currentProject) {
        const updated = projects.find(p => p.id === currentProject.id);
        if (updated && updated !== currentProject) {
            setCurrentProject(updated);
        }
    }
  }, [projects]);





  const handleCompilationComplete = async (result: CompilationResult | null) => {
    setCompileResult(result);
    setActiveCompileDeployment(null);
    if (result && result.success && currentProject) {
       setHasCompiledInSession(true);
       lastCompiledSourceRef.current = code;
       const report = scanContract(code);
       setSecurityReport(report);

       if (activeFileId) {
         try {
           const contentHash = await computeContentHash(code);
           const saved = await saveCompilation(userId, currentProject.id, result, {
             fileId: activeFileId,
             contentHash,
             securityReport: report,
           });
           lastCompilationId.current = saved.id;
         } catch (e) {
           console.error('Failed to persist compilation:', e);
         }
       }

       setShowBottomPanel(true);
       setActiveBottomTab('output');
    } else {
       setHasCompiledInSession(false);
       lastCompiledSourceRef.current = null;
       setSecurityReport(null);
    }
  };

  const triggerCompile = async (forceCompileAll: boolean = false, targetFilesOverride?: { name: string, content: string }[]): Promise<CompilationResult | null> => {
    if (!code && !forceCompileAll) return null;
    setIsCompiling(true);
    try {
      const template = allTemplates.find(t => t.code === code);
      const hardcodedBytecode = template?.hardcodedBytecode;
      const projectFilesMap = targetFilesOverride || currentProject?.files?.map((f: ContractFile) => ({ 
        name: f.name, 
        content: f.id === activeFileId ? code : f.content 
      }));
      
      // compileWithHardhat is statically imported at the top
      // If forceCompileAll is true, we pass a special flag in sourceCode to hardhatCompiler
      const sourceSet = forceCompileAll ? '__COMPILE_ALL__' : code;
      const activeFileName = projects.find(p => p.id === currentProject?.id)?.files?.find((f: ContractFile) => f.id === activeFileId)?.name || 'contract.sol';
      
      const result = await compileWithHardhat(sourceSet, hardcodedBytecode, projectFilesMap, compilerVersion, undefined, activeFileName);
      await handleCompilationComplete(result);
      return result;
    } catch (error) {
      console.error('Compilation error:', error);
      const errResult = {
        success: false,
        errors: [{ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' }]
      };
      await handleCompilationComplete(errResult);
      return errResult;
    } finally {
      setIsCompiling(false);
    }
  };

  const handleCompileFolder = async (projectId: string, folderPath: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.files) return;
    
    // Filter files in this folder
    const folderFiles = project.files
        .filter(f => f.name.startsWith(folderPath + '/'))
        .map(f => ({ name: f.name, content: f.id === activeFileId ? code : f.content }));
    
    if (folderFiles.length === 0) {
        alert("No contracts found in this folder.");
        return;
    }
    
    // In our simplified browser compiler, 'compile folder' will treat all files in folder as valid targets
    await triggerCompile(true, folderFiles);
  };

  const handleCompileWorkspace = async (_projectId: string) => {
    await triggerCompile(true);
  };

  const triggerAIDeploy = async () => {
    if (!compileResult || !compileResult.success || !compileResult.bytecode) {
      alert("No successful compilation found to deploy.");
      return;
    }
    
    try {
       // browserVM is statically imported at the top
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
       
       addSimulation(newSim, {
         deployment_kind: 'deploy',
         bytecode: compileResult.bytecode,
         constructor_args: [],
         gas_limit: result.gasUsed,
       });
    } catch (e: any) {
       console.error("AI Deployment failed", e);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const persistDeployment = async (
    entry: SimulatedDeployment,
    extra: Partial<SaveDeploymentPayload> = {}
  ) => {
    if (!currentProject) return null;
    return saveDeployment(userId, currentProject.id, {
      simulated_chain: entry,
      network: entry.network,
      tx_hash: entry.transactionHash,
      contract_address: entry.contractAddress,
      status: entry.status,
      gas_used: entry.gasUsed,
      deployer: entry.deployer,
      abi: (compileResult?.abi || entry.abi || []) as unknown[],
      file_id: activeFileId,
      compilation_id: lastCompilationId.current ?? undefined,
      deployment_kind: (extra.deployment_kind ?? 'deploy') as DeploymentKind,
      bytecode: extra.bytecode,
      constructor_args: extra.constructor_args,
      call_data: extra.call_data,
      call_value_wei: extra.call_value_wei,
      gas_limit: extra.gas_limit,
    });
  };

  const addSimulation = (
    entry: SimulatedDeployment,
    extra: Partial<SaveDeploymentPayload> = {}
  ) => {
    setSimulations(prev => [entry, ...prev]);
    persistDeployment(entry, extra).catch(console.error);
    setActiveDeployment({ address: entry.contractAddress, abi: compileResult?.abi || entry.abi || [], network: entry.network });
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
    setActiveDeployment(null);
    setShowResetConfirm(false);
    await deleteDeployments(userId, currentProject.id);
    await browserVM.reset();
  };

  const handleDeleteProject = (projectId: string) => {
    setConfirmModal({
      title: 'Delete Workspace',
      message: 'Permanently delete this workspace and all its files? This cannot be undone.',
      confirmLabel: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
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
        }
      }
    });
  };

  const handleCreateWorkspace = async (wsName: string) => {
    try {
      // Create a basic workspace
      const newWS = await createProject(userId, { 
        name: wsName, 
        code: '', 
        template: 'basic', 
        type: 'ERC20' 
      });

      // Create a hidden .keep file so the explorer shows something or a README
      const newFile = await createFile(userId, newWS.id, '.keep', '');
      const wsWithFile = { ...newWS, files: [newFile] };

      setProjects([wsWithFile, ...projects]);
      setCurrentProject(wsWithFile);
      setActiveFileId(undefined); // No active file initially since it's just a .keep
      setCode('');
      setShowWorkspaceModal(false);
    } catch (e) {
      console.error('Failed to create workspace:', e);
    }
  };

  const handleSelectFile = async (projectId: string, file: ContractFile) => {
     if (activeFileId === file.id) return;
     
     if (activeFileId && code !== undefined) {
       updateFile(activeFileId, code).catch(console.error);
       setProjects(prev => prev.map(p => ({
         ...p,
         files: p.files?.map(f => f.id === activeFileId ? { ...f, content: code } : f)
       })));
       
       fileStateCache.current[activeFileId] = {
           compileResult,
           securityReport,
           simulations,
           hasCompiledInSession,
           activeCompileDeployment,
           lastCompiledSource: lastCompiledSourceRef.current,
       };
     }
     
     switchingFileRef.current = true;
     
     setActiveFileId(file.id);
     setCode(file.content);
     const project = projects.find(p => p.id === projectId);
     if (project) setCurrentProject(project);
  };

  const handleAddFile = async (workspaceId: string, parentPath?: string) => {
    setAddFileContext({ workspaceId, parentPath });
    setShowAddFileModal(true);
  };

  const handleConfirmAddFile = async (fileName: string, templateId: string) => {
    if (!addFileContext) return;
    const { workspaceId, parentPath } = addFileContext;
    
    let content = '// New Contract';
    if (templateId === 'empty') {
      content = '// SPDX-License-Identifier: MIT\npragma solidity 0.8.20;\n\ncontract NewContract {\n    \n}';
    } else {
      const template = allTemplates.find(t => t.id === templateId);
      if (template) content = template.code;
    }

    const finalName = parentPath ? `${parentPath}/${fileName}` : fileName;
    
    try {
      const file = await createFile(userId, workspaceId, finalName, content);
      setProjects(prev => prev.map(p => p.id === workspaceId ? { ...p, files: [...(p.files || []), file] } : p));
      setActiveFileId(file.id);
      setCode(file.content);
      setShowAddFileModal(false);
      setAddFileContext(null);
    } catch (e: any) { 
        console.error('Failed to add file:', e);
        alert(e.message || 'Failed to add file');
    }
  };

  const handleAddFolder = (workspaceId: string, parentPath?: string) => {
    setInputModal({
      title: 'New Folder',
      label: 'Folder name',
      placeholder: 'e.g. lib',
      defaultValue: 'new_folder',
      onConfirm: async (name: string) => {
        const folderPath = parentPath ? `${parentPath}/${name}` : name;
        const placeholderPath = `${folderPath}/.keep`;
        try {
          const file = await createFile(userId, workspaceId, placeholderPath, '');
          setProjects(projects.map(p => p.id === workspaceId ? { ...p, files: [...(p.files || []), file] } : p));
        } catch (e: any) {
          console.error('Failed to add folder:', e);
        }
      }
    });
  };

  const handleDeleteFolder = (workspaceId: string, folderPath: string) => {
    setConfirmModal({
      title: 'Delete Folder',
      message: `Delete the folder "${folderPath}" and all its contents? This cannot be undone.`,
      confirmLabel: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        const project = projects.find(p => p.id === workspaceId);
        if (!project || !project.files) return;
        const filesToDelete = project.files.filter(f => f.name.startsWith(folderPath + '/'));
        try {
          await Promise.all(filesToDelete.map(f => deleteFile(f.id)));
          setProjects(projects.map(p => p.id === workspaceId ? { ...p, files: p.files!.filter(f => !f.name.startsWith(folderPath + '/')) } : p));
          if (activeFileId && filesToDelete.some(f => f.id === activeFileId)) {
            setActiveFileId(undefined); setCode('');
          }
        } catch(e) { console.error('Delete folder failed', e); }
      }
    });
  };


  const handleImportWorkspace = (workspaceId: string) => {
     const input = document.getElementById('workspace-import-input') as HTMLInputElement;
     if (input) {
       input.dataset.workspaceId = workspaceId;
       input.click();
     }
  };

  const handleImportZipWorkspace = (workspaceId: string) => {
    const input = document.getElementById('workspace-zip-import-input') as HTMLInputElement;
    if (input) {
      input.dataset.workspaceId = workspaceId;
      input.click();
    }
  };

  const handleExportZipWorkspace = async (workspaceId: string) => {
    const project = projects.find(p => p.id === workspaceId);
    if (!project || !project.files || project.files.length === 0) {
      alert("No files in this workspace to export.");
      return;
    }

    try {
      const { zip, strToU8 } = await import('fflate');
      
      const zipData: Record<string, Uint8Array> = {};
      project.files.forEach(file => {
        // Skip .keep placeholder files
        if (file.name === '.keep') return;
        zipData[file.name] = strToU8(file.content || '');
      });

      zip(zipData, (err, data) => {
        if (err) {
          console.error("ZIP Generation Error", err);
          alert("Failed to generate ZIP archive.");
          return;
        }
        const blob = new Blob([data], { type: 'application/zip' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_workspace.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (e: any) {
      alert("Failed to export workspace: " + e.message);
    }
  };

  const onWorkspaceZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const workspaceId = e.target.dataset.workspaceId;
    if (!files || files.length === 0 || !workspaceId) return;

    const project = projects.find(p => p.id === workspaceId);
    if (!project) return;

    try {
      const { unzip, strFromU8 } = await import('fflate');
      const zipFile = files[0];
      const arrayBuffer = await zipFile.arrayBuffer();
      const zipBytes = new Uint8Array(arrayBuffer);

      unzip(zipBytes, async (err, unzipped) => {
        if (err) {
          console.error("ZIP Extraction Error", err);
          alert("Failed to unzip archive. Ensure it is a valid ZIP file.");
          return;
        }

        let importedCount = 0;
        const newFiles: ContractFile[] = [];

        // Loop through all unzipped entries
        const entries = Object.entries(unzipped);
        for (const [filePath, fileData] of entries) {
          // Skip folders (fflate represents folders as trailing slash entries or empty data)
          if (filePath.endsWith('/') || fileData.length === 0) continue;

          try {
            const content = strFromU8(fileData);
            const created = await createFile(userId, workspaceId, filePath, content);
            newFiles.push(created);
            importedCount++;
          } catch (err) {
            console.warn(`Skipped ${filePath}:`, err);
          }
        }

        if (importedCount > 0) {
          setProjects(prev => prev.map(p => p.id === workspaceId ? { ...p, files: [...(p.files || []), ...newFiles] } : p));
          alert(`Successfully imported ${importedCount} items from ZIP.`);
        } else {
          alert("No valid files found in the ZIP archive.");
        }
      });
    } catch (err: any) {
      alert("Failed to process ZIP file: " + err.message);
    }

    e.target.value = '';
  };

  const onWorkspaceFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const workspaceId = e.target.dataset.workspaceId;
    if (!files || !workspaceId) return;

    const project = projects.find(p => p.id === workspaceId);
    if (!project) return;

    let importedCount = 0;
    const newFiles: ContractFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Normalize Windows backslashes to forward slashes
      const rawPath = (file as any).webkitRelativePath || file.name;
      const normalizedPath = rawPath.replace(/\\/g, '/');
      // Remove the top-level folder name from the path if it's there
      const parts = normalizedPath.split('/');
      const finalPath = parts.slice(1).join('/') || normalizedPath;

      if (!finalPath) continue;

      try {
        const content = await file.text();
        const created = await createFile(userId, workspaceId, finalPath, content);
        newFiles.push(created);
        importedCount++;
      } catch (err) {
        console.warn(`Skipped ${finalPath}:`, err);
      }
    }

    if (importedCount > 0) {
      setProjects(projects.map(p => p.id === workspaceId ? { ...p, files: [...(p.files || []), ...newFiles] } : p));
      alert(`Successfully imported ${importedCount} items.`);
    }
    
    // Clear input
    e.target.value = '';
  };

  const handleDeleteFile = (fileId: string) => {
    setConfirmModal({
      title: 'Delete File',
      message: 'Permanently delete this contract file? This cannot be undone.',
      confirmLabel: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
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
      }
    });
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

  const handleInjectContract = (codeContent: string, type: string) => {
    if (!currentProject) {
      setConfirmModal({
        title: 'No Workspace Selected',
        message: 'Please select or create a workspace first before injecting a contract.',
        confirmLabel: 'OK',
        isDangerous: false,
        onConfirm: () => {}
      });
      return;
    }
    setInputModal({
      title: 'Inject Contract',
      label: 'File name',
      placeholder: 'e.g. MyToken.sol',
      defaultValue: `${type}Token.sol`,
      onConfirm: async (inputName: string) => {
        const name = inputName.endsWith('.sol') ? inputName : `${inputName}.sol`;
        try {
          const file = await createFile(userId, currentProject.id, name, codeContent);
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
      }
    });
  };

  const handleAIQuery = (prompt: string) => {
    setAiPromptOverride({ prompt, theme: "Gas Optimization" });
    setActiveRightActivity('ai');
    setShowRightSidebar(true);
  };

  const handleTransactionExecuted = async (payload: {
    txHash: string;
    callData: string;
    contractAddress: string;
    gasUsed: number;
    callValueWei?: string;
    gasLimit?: number;
  }) => {
    if (!compileResult || !compileResult.sourceMap || !currentProject) return;

    const execSimulation: SimulatedDeployment = {
      network: 'Local Simulation',
      transactionHash: payload.txHash,
      contractAddress: payload.contractAddress,
      status: 'confirmed',
      gasUsed: payload.gasUsed,
      deployer: browserVM.getActiveAccount(),
      timestamp: new Date().toISOString(),
      blockNumber: await browserVM.getBlockNumber(),
      isRealChain: false,
    };
    setSimulations((prev) => [execSimulation, ...prev]);

    setIsProfiling(true);
    setActiveRightActivity('profiler');
    setShowRightSidebar(true);

    try {
      const savedDeploy = await persistDeployment(execSimulation, {
        deployment_kind: 'execute',
        call_data: payload.callData,
        call_value_wei: payload.callValueWei ?? '0',
        gas_limit: payload.gasLimit ?? payload.gasUsed,
      });

      const trace = await browserVM.getTransactionTrace(payload.txHash);
      if (trace) {
        const sourceMap = parseSourceMap(compileResult.sourceMap);
        const result = mapTraceToLines(
          trace,
          sourceMap,
          code,
          compileResult.bytecode,
          browserVM.getTraceDepthFilter()
        );
        setProfilerData({
          lineGasMap: result.lineGasMap,
          totalGas: result.totalTracedGas || trace.gas || 0,
          quality: result.quality,
          unmappedGas: result.unmappedGas,
          traceTree: trace.traceTree,
        });

        if (savedDeploy && activeFileId) {
          await saveGasProfile(userId, {
            projectId: currentProject.id,
            fileId: activeFileId,
            deploymentId: savedDeploy.id,
            gasUsed: result.totalTracedGas || trace.gas || 0,
            contractSize: compileResult.contractSize ?? 0,
            securityScore: securityReport?.score,
            txHash: payload.txHash,
            quality: result.quality,
            unmappedGas: result.unmappedGas,
            lineGasMap: result.lineGasMap,
          });
        }
      }
    } catch (e) {
      console.error('Failed to map trace', e);
    } finally {
      setIsProfiling(false);
    }
  };

  const handlePromoteContract = () => {
    if (!isConnected || !signer) {
      setConfirmModal({
        title: 'Wallet Not Connected',
        message: 'Please connect a MetaMask wallet using the wallet button in the header before promoting to a live network.',
        confirmLabel: 'OK',
        isDangerous: false,
        onConfirm: () => {}
      });
      return;
    }
    if (!compileResult || !compileResult.bytecode) {
      setConfirmModal({
        title: 'Not Compiled',
        message: 'Please compile your contract successfully before promoting to a live network.',
        confirmLabel: 'OK',
        isDangerous: false,
        onConfirm: () => {}
      });
      return;
    }

    setConfirmModal({
      title: 'Promote to Live Network',
      message:
        'You are about to deploy this contract to a live network via MetaMask.\n\n' +
        '• Gas fees will be real and subject to network conditions.\n' +
        '• Line-by-line Gas Heatmaps are unavailable for promoted contracts.\n\n' +
        'Make sure your security score is high before proceeding.',
      confirmLabel: 'Promote',
      isDangerous: false,
      onConfirm: async () => {
        try {
          const processedArgs = compileResult!.abi
            ? parseConstructorArgsFromAbi(compileResult!.abi, {})
            : [];
          const factory = new ethers.ContractFactory(
            compileResult!.abi as any,
            compileResult!.bytecode!,
            signer
          );
          const deployTx = await factory.deploy(...processedArgs);
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
          addSimulation(promotedEntry, {
            deployment_kind: 'promoted',
            constructor_args: processedArgs,
          });
        } catch (e: any) {
          console.error('Promotion to MetaMask Failed:', e);
          setConfirmModal({
            title: 'Deployment Failed',
            message: e.reason || e.message || String(e),
            confirmLabel: 'OK',
            isDangerous: true,
            onConfirm: () => {}
          });
        }
      }
    });
  };

  const handleVersionChange = (newVersion: string) => {
    setCompilerVersion(newVersion);
    if (currentProject) {
      updateProject(currentProject.id, { compiler_version: newVersion }).catch(console.error);
    }
    setVersionNotification({ message: `Compiler set to v${newVersion}`, type: 'success' });
    setTimeout(() => setVersionNotification(null), 3000);
  };



  const handleBeforeIdentityLink = async () => {
    if (activeFileId && code) {
      await updateFile(activeFileId, code);
    }
  };

  // Desktop notice dismiss state
  const [showDesktopNotice, setShowDesktopNotice] = useState(() => {
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('cryptp-dismiss-desktop-notice');
    }
    return true;
  });

  const dismissDesktopNotice = () => {
    setShowDesktopNotice(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cryptp-dismiss-desktop-notice', 'true');
    }
  };

  return (
    <div className="min-h-dvh h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] selection:bg-blue-500/30 overflow-hidden font-sans relative">
      
      {/* 🔔 Version Shift Notification */}
      {versionNotification && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
           <div className={`px-4 py-2 rounded-full border shadow-2xl flex items-center gap-2 ${
             versionNotification.type === 'success' ? 'bg-[#007acc]/20 border-[#007acc] text-blue-100' : 'bg-yellow-500/20 border-yellow-500 text-yellow-100'
           }`}>
              <Check className="size-4" />
              <span className="text-[10px] font-black uppercase tracking-wider">{versionNotification.message}</span>
           </div>
        </div>
      )}
       {!(window as any).ethereum && (
        <div className="bg-red-950/20 backdrop-blur-md border-b border-red-500/10 px-4 py-1.5 flex items-center justify-center gap-2 z-[70] shrink-0 text-center">
          <Terminal className="h-3.5 w-3.5 text-red-500/60 shrink-0" />
          <span className="text-[10px] text-red-100/60 font-black uppercase tracking-widest max-md:hidden">
            Identity Provider (MetaMask) Missing - High-Fidelity simulation mode active
          </span>
          <span className="text-[10px] text-red-100/60 font-black uppercase tracking-widest md:hidden">
            Simulation mode — use desktop for full experience
          </span>
          <a href="https://metamask.io" target="_blank" rel="noreferrer" className="text-[9px] font-black text-blue-500 hover:text-blue-400 uppercase border border-blue-500/20 px-2 py-0.5 rounded ml-4 transition-all hover:bg-blue-500/10 max-md:hidden">
            Secure Node
          </a>
        </div>
      )}

      {/* 🚀 Header */}
      <header className="h-10 border-b border-white/5 bg-[#1a1a1c]/80 backdrop-blur-xl flex items-center px-4 max-md:px-2 justify-between shrink-0 select-none z-[60] shadow-sm">
        <div className="flex items-center gap-4 max-md:gap-2">
           <div className="flex items-center gap-2.5 group cursor-pointer">
              <div className="bg-[#007acc] size-5 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                <Code2 className="size-3 text-white" />
              </div>
              <span className="text-[12px] font-black tracking-[-0.05em] text-white uppercase italic">Crypt<span className="text-[#007acc]">P</span> <span className="opacity-30 font-light ml-1 lowercase tracking-normal max-md:hidden">lab</span></span>
           </div>
           <div className="h-4 w-px bg-white/5 mx-1 max-md:hidden"></div>
           <div className="flex items-center gap-2 group max-md:hidden">
              <span className="text-[10px] text-gray-500 font-bold tracking-tight group-hover:text-blue-400 transition-colors">
                {currentProject?.name || 'Loading...'}
              </span>
              <ChevronLeft className="size-3 text-gray-700 -rotate-90" />
              <span className="text-[10px] text-gray-400 font-black tracking-tight">
                {projects.find(p => p.id === currentProject?.id)?.files?.find((f: ContractFile) => f.id === activeFileId)?.name || 'Untitled.sol'}
              </span>
           </div>
           <div className="flex items-center gap-1 md:hidden">
              <span className="text-[10px] text-gray-400 font-black tracking-tight truncate max-w-[100px]">
                {currentProject?.name || 'Loading...'}
              </span>
           </div>
        </div>
        <div className="flex items-center gap-2 max-md:gap-1">
           {compileResult?.success && (
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/20 rounded-full max-md:hidden">
                <Check className="size-2.5 text-green-500" />
                <span className="text-[8px] text-green-500 font-black uppercase tracking-widest">Ready</span>
             </div>
           )}
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-900 border border-gray-800 rounded-full max-md:hidden" title="Compiler: Browser-Native (WASM)">
               <div className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
               <span className="text-[8px] text-gray-500 font-bold uppercase tracking-widest">WASM</span>
            </div>
           <button onClick={() => { setGithubModalTab(undefined); setShowGitHubModal(true); }} className="p-1 hover:bg-[#3d3d3d] rounded text-gray-400 hover:text-white transition-colors max-md:hidden" title="GitHub Sync">
             <Github className="size-4" />
           </button>
           <div className="max-md:hidden">
             <WalletConnect />
           </div>
           <button onClick={handleSignOut} className="px-2 py-1 text-[9px] font-black text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest">Exit</button>
        </div>
      </header>

      {/* ⚠️ Desktop-only notice for mobile viewports */}
      {showDesktopNotice && (
        <div className="md:hidden bg-blue-950/40 border-b border-blue-500/20 px-4 py-2 flex items-center justify-between gap-3 z-50 shrink-0">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-blue-400 shrink-0" />
            <span className="text-[10px] text-blue-200 font-medium leading-tight">
              CryptP is built for desktop. Open on a laptop for the full IDE experience.
            </span>
          </div>
          <button 
            onClick={dismissDesktopNotice} 
            className="text-[9px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest border border-blue-500/30 px-2 py-0.5 rounded transition-colors shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        
        {/* 🛠️ Standalone Activity Bar */}
        <aside className="w-14 bg-[#1a1a1c]/95 backdrop-blur-2xl border-r border-white/5 flex flex-col items-center py-4 shrink-0 z-50 gap-4 max-md:hidden">
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
            <aside style={{ width: `${sidebarWidth}px` }} className="bg-[#252526] border-r border-[#1e1e1e] flex flex-col shrink-0 z-40 relative group max-md:hidden">
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
                      onAddFolder={handleAddFolder}
                      onDeleteFolder={handleDeleteFolder}
                      onImportWorkspace={handleImportWorkspace}
                      onImportZipWorkspace={handleImportZipWorkspace}
                      onExportZipWorkspace={handleExportZipWorkspace}
                      onDeleteFile={handleDeleteFile}
                      onDeleteProject={handleDeleteProject}
                      onCompileFolder={handleCompileFolder}
                      onCompileWorkspace={handleCompileWorkspace}
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
                    canInteract={hasCompiledInSession && compileResult?.success === true}
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
                {activeActivity === 'analytics' && (
                   <React.Suspense fallback={<div className="p-4 text-xs text-gray-500 font-bold uppercase tracking-widest animate-pulse">Loading Analytics...</div>}>
                     <AnalyticsSidebar 
                       compileResult={compileResult || undefined} 
                       sourceCode={code} 
                       securityReport={securityReport} 
                       isCompiled={hasCompiledInSession}
                       currentVersion={compilerVersion}
                       onVersionChange={handleVersionChange}
                     />
                   </React.Suspense>
                )}
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
            <div onMouseDown={startResizingSidebar} className={`w-[1px] hover:w-[3px] bg-[#1e1e1e] hover:bg-[#007acc] cursor-col-resize transition-all z-50 shrink-0 max-md:hidden ${isResizingSidebar ? 'bg-[#007acc] !w-[3px]' : ''}`} />
          </>
        )}

        {/* 💻 Center Editor Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative bg-[#1e1e1e]">
          <div className="h-9 bg-[#252526] border-b border-[#2d2d2d] flex items-center px-4 gap-2 justify-between shrink-0 z-30 max-md:hidden">
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
            {!activeFileId ? (
              /* ── Welcome / empty-state shown when no file is open ── */
              <div className="h-full overflow-y-auto custom-scrollbar flex flex-col items-center justify-start bg-[#1e1e1e] p-8 gap-6">
                <div className="w-full max-w-lg">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-[#007acc] size-8 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <svg className="size-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </div>
                    <div>
                      <h2 className="text-[15px] font-black text-white tracking-tight">Welcome to CryptP</h2>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Open or create a file to start editing</p>
                    </div>
                  </div>
                  <DeploymentGuide isSidebar={true} />
                </div>
              </div>
            ) : (
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
            )}
          </div>

          {/* 📠 Bottom Panel */}
          {showBottomPanel && (
            <>
              <div onMouseDown={startResizingBottomPanel} className={`h-[1px] hover:h-[3px] bg-[#2d2d2d] hover:bg-[#007acc] cursor-row-resize transition-all z-50 shrink-0 max-md:hidden ${isResizingBottomPanel ? 'bg-[#007acc] !h-[3px]' : ''}`} />
              <div style={{ height: `${bottomPanelHeight}px` }} className="bg-[#1e1e1e] border-t border-[#2d2d2d] flex flex-col overflow-hidden z-30 max-md:hidden">
                 <div className="flex bg-[#252526] border-b border-[#2d2d2d] shrink-0">
                    <button onClick={() => setActiveBottomTab('output')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-t-2 transition-all ${activeBottomTab === 'output' ? 'text-white border-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] border-transparent hover:text-white'}`}>Output</button>
                    <button onClick={() => setActiveBottomTab('security')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-t-2 transition-all ${activeBottomTab === 'security' ? 'text-white border-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] border-transparent hover:text-white'}`}>Problem Audit</button>
                    <button onClick={() => setActiveBottomTab('terminal')} className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border-t-2 transition-all ${activeBottomTab === 'terminal' ? 'text-white border-[#007acc] bg-[#1e1e1e]' : 'text-[#858585] border-transparent hover:text-white'}`}>Terminal</button>
                    <div className="flex-1"></div>
                    <button onClick={() => setShowBottomPanel(false)} className="p-2 text-[#858585] hover:text-white"><ChevronLeft className="size-4 rotate-[-90deg]" /></button>
                 </div>
                 <div className="flex-1 overflow-auto custom-scrollbar">
                    {activeBottomTab === 'output' && compileResult && (
                      <div className="p-4">
                        <CompileOutput
                          result={compileResult}
                          code={code}
                          canDeploy={
                            hasCompiledInSession
                            && compileResult.success === true
                            && lastCompiledSourceRef.current === code
                          }
                          onDeployment={(s, extra) => {
                            addSimulation(s, extra);
                            setActiveCompileDeployment(s);
                          }}
                          deploymentResult={activeCompileDeployment}
                        />
                      </div>
                    )}
                    {activeBottomTab === 'security' && <SecurityAudit report={securityReport} isScanning={isScanning} hasCompileError={compileResult?.success === false} />}
                    {activeBottomTab === 'terminal' && (
                       <AethonTerminal 
                         currentProject={currentProject}
                         activeFileCode={code}
                         compileResult={compileResult}
                         securityReport={securityReport}
                         onCompile={() => triggerCompile(false)}
                         onDeploy={triggerAIDeploy}
                         lastCompiledSource={lastCompiledSourceRef.current}
                       />
                     )}
                 </div>
              </div>
            </>
          )}
        </div>

        {/* 🤖 Secondary Sidebar (Right) - AI Assistant */}
        {showRightSidebar && (
          <>
            <div onMouseDown={startResizingRightSidebar} className={`w-[1px] hover:w-[3px] bg-[#1e1e1e] hover:bg-[#007acc] cursor-col-resize transition-all z-50 shrink-0 max-md:hidden ${isResizingRightSidebar ? 'bg-[#007acc] !w-[3px]' : ''}`} />
            <aside style={{ width: `${rightSidebarWidth}px` }} className="bg-[#252526] border-l border-[#1e1e1e] flex flex-col shrink-0 z-40 relative h-full max-md:hidden">
              {activeRightActivity === 'ai' && (
                <React.Suspense fallback={<div className="p-4 text-xs text-gray-500 font-bold uppercase tracking-widest animate-pulse">Loading AI Assistant...</div>}>
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
                </React.Suspense>
              )}
              {activeRightActivity === 'profiler' && <GasProfiler lineGasMap={profilerData.lineGasMap} totalGas={profilerData.totalGas} isProfiling={isProfiling} quality={profilerData.quality} unmappedGas={profilerData.unmappedGas} traceTree={profilerData.traceTree} />}
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
             <span className="text-[10px] font-bold truncate max-md:max-w-[100px]">
               {isConnected 
                 ? `${account?.slice(0, 6)}...${account?.slice(-4)} (${networkName})` 
                 : isConnecting ? 'Connecting...' : 'Wallet Disconnected'
               }
             </span>
           </div>
           {isConnected && (
             <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-white/10 rounded max-md:hidden">
                <span className="text-[10px] font-bold text-white/90">{balance} ETH</span>
             </div>
           )}
        </div>
        <div className="flex items-center gap-3 px-3 max-md:hidden">
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
      {showGitHubModal && <GitHubSyncModal
        isOpen={showGitHubModal}
        initialTab={githubModalInitialTab}
        onClose={() => setShowGitHubModal(false)}
        userId={userId}
        currentProject={currentProject}
        onWorkspaceCreated={(p) => { setProjects([p, ...projects]); setCurrentProject(p); setShowGitHubModal(false); }}
        onPullComplete={(freshFiles) => {
          if (!currentProject) return;
          // Update the project's files array in state
          const updatedProject = { ...currentProject, files: freshFiles };
          setCurrentProject(updatedProject);
          setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
          // If the active file was updated, refresh the editor
          const activeUpdated = freshFiles.find(f => f.id === activeFileId);
          if (activeUpdated) {
            setCode(activeUpdated.content);
          } else if (freshFiles.length > 0 && !activeFileId) {
            setActiveFileId(freshFiles[0].id);
            setCode(freshFiles[0].content);
          }
        }}
      />}

      {showAddFileModal && <AddFileModal onClose={() => { setShowAddFileModal(false); setAddFileContext(null); }} onConfirm={handleConfirmAddFile} folderPath={addFileContext?.parentPath} />}
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

      {/* ✅ Confirm Modal (replaces window.confirm) */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          isDangerous={confirmModal.isDangerous}
          onConfirm={() => { confirmModal.onConfirm(); setConfirmModal(null); }}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ✅ Input Modal (replaces window.prompt) */}
      {inputModal && (
        <InputModal
          title={inputModal.title}
          label={inputModal.label}
          placeholder={inputModal.placeholder}
          defaultValue={inputModal.defaultValue}
          onConfirm={(val) => { inputModal.onConfirm(val); setInputModal(null); }}
          onCancel={() => setInputModal(null)}
        />
      )}
      <input 
        id="workspace-import-input"
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={onWorkspaceFolderUpload}
        {...({ webkitdirectory: '', directory: '' } as any)}
      />
      <input 
        id="workspace-zip-import-input"
        type="file"
        accept=".zip"
        style={{ display: 'none' }}
        onChange={onWorkspaceZipUpload}
      />
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
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`p-2 transition-all ${active ? 'text-white' : 'text-[#858585] hover:text-white'}`}
    >
      {icon}
    </button>
    <div className="absolute left-full ml-2 px-2 py-1 bg-[#252526] border border-[#454545] text-white text-[10px] font-medium rounded shadow-2xl opacity-0 group-hover:opacity-100 translate-x-1 pointer-events-none transition-all z-[100] whitespace-nowrap top-1/2 -translate-y-1/2">
      {label}
      <div className="absolute top-1/2 -left-1 -translate-y-1/2 size-2 bg-[#252526] border-l border-b border-[#454545] rotate-45" />
    </div>
  </div>
);

export default IDELayout;
