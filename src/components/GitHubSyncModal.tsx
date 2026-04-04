import React, { useState, useEffect } from 'react';
import { X, Github, Download, Upload, RefreshCw, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { Project, ContractFile, createProject, createFile, updateProject, getFiles } from '../utils/userData';
import { listUserRepos, createRepository, pushFileToRepo, GitHubRepo, GitHubError } from '../utils/github';

interface GitHubSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentProject: Project | null;
  onWorkspaceCreated: (project: Project) => void;
  initialTab?: 'import' | 'export' | 'sync';
}

export function GitHubSyncModal({ isOpen, onClose, userId, currentProject, onWorkspaceCreated, initialTab }: GitHubSyncModalProps) {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'sync'>('export');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [newRepoName, setNewRepoName] = useState('');
  
  const [commitMessage, setCommitMessage] = useState('Update contracts via CryptP IDE');
  const [selectedSyncFiles, setSelectedSyncFiles] = useState<Record<string, boolean>>({});
  const [localFiles, setLocalFiles] = useState<ContractFile[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      } else if (!currentProject) {
        setActiveTab('import');
      } else if (currentProject.github_repo) {
        setActiveTab('sync');
      } else {
        setActiveTab('export');
      }
      loadRepos();
    }
  }, [isOpen, currentProject, initialTab]);

  useEffect(() => {
    if (activeTab === 'sync' && currentProject) {
        getFiles(currentProject.id).then(files => {
            setLocalFiles(files);
            const initial: Record<string, boolean> = {};
            files.forEach(f => initial[f.id] = true);
            setSelectedSyncFiles(initial);
        });
    }
  }, [activeTab, currentProject]);

  const loadRepos = async () => {
    try {
      const data = await listUserRepos();
      setRepos(data);
    } catch (err: any) {
      if (err instanceof GitHubError && err.status === 401) {
        setError('GitHub Token missing or invalid. Please ensure you logged in with GitHub and granted repository access.');
      }
    }
  };

  const handleExport = async () => {
    if (!currentProject) return;
    if (!newRepoName.trim()) {
      setError('Please provide a repository name.');
      return;
    }
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      // 1. Create Repo on GitHub
      const repo = await createRepository(newRepoName, `Exported from CryptP IDE: ${currentProject.name}`);
      
      // 2. Fetch local files
      const files = await getFiles(currentProject.id);

      // 3. Push files to new repo (sequentially for simplicity, GitHub API rate limits parallel PUTs sometimes)
      for (const file of files) {
        await pushFileToRepo(repo.full_name, file.name, file.content || '', 'Initial commit from CryptP');
      }

      // 4. Update the Project in Supabase
      await updateProject(currentProject.id, {
        github_repo: repo.full_name,
        github_branch: 'main',
      });

      setSuccess(`Successfully exported to ${repo.full_name}!`);
      setTimeout(() => {
        onClose();
        // Force reload or state update in parent might be needed
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to export workspace.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!currentProject || !currentProject.github_repo) return;
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const filesToSync = localFiles.filter(f => selectedSyncFiles[f.id]);
      
      if (filesToSync.length === 0) {
          setError('No files selected for sync.');
          setIsLoading(false);
          return;
      }

      for (const file of filesToSync) {
          let sha;
          try {
              const { getRepoContents } = await import('../utils/github');
              const existingFile: any = await getRepoContents(currentProject.github_repo, file.name);
              if (existingFile && !Array.isArray(existingFile)) {
                  sha = existingFile.sha;
              }
          } catch (e: any) {
              // 404 means it's a new file, which is fine.
              if (e.status !== 404) throw e;
          }

          await pushFileToRepo(
              currentProject.github_repo, 
              file.name, 
              file.content || '', 
              commitMessage || `Update ${file.name} via CryptP`,
              currentProject.github_branch || 'main',
              sha
          );
      }

      setSuccess(`Successfully synced ${filesToSync.length} files with ${currentProject.github_repo}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to sync with repository.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportRepo = async (repo: GitHubRepo) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    try {
        const { fetchRepoTreeRecursive, fetchBlobContent } = await import('../utils/github');
        const treeItems = await fetchRepoTreeRecursive(repo.full_name, repo.default_branch);
        
        // Filter for any Solidity files recursively
        const solFiles = treeItems.filter(item => item.type === 'blob' && item.path.endsWith('.sol'));

        if (solFiles.length === 0) {
            throw new Error('No .sol files found anywhere in this repository.');
        }

        const ws = await createProject(userId, {
            name: repo.name,
            code: '',
            template: 'basic',
            type: 'ERC20',
            github_repo: repo.full_name,
            github_branch: repo.default_branch,
        });

        // Download and create each file
        for (const item of solFiles) {
            const textContent = await fetchBlobContent(item.url);
            // Note: We use item.path instead of item.name so it preserves the "src/contracts/Token.sol" path string in DB!
            await createFile(userId, ws.id, item.path, textContent);
        }

        const allFiles = await getFiles(ws.id);
        const wsWithFiles = { ...ws, files: allFiles };

        if (allFiles.length > 0) {
            await updateProject(wsWithFiles.id, { active_file_id: allFiles[0].id } as any);
            wsWithFiles.active_file_id = allFiles[0].id;
        }

        setSuccess(`Successfully imported ${repo.name}!`);
        setTimeout(() => {
            onWorkspaceCreated(wsWithFiles);
        }, 1500);

    } catch (err: any) {
        setError(err.message || 'Failed to import repository.');
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-[#1e1e24] border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1a1a1f]">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">GitHub Integration</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex gap-3 text-red-500 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex gap-3 text-green-500 text-sm">
              <CheckCircle className="w-5 h-5 shrink-0" />
              <p>{success}</p>
            </div>
          )}

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'import' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              Import
            </button>
            <button
              onClick={() => setActiveTab('export')}
              disabled={!!currentProject?.github_repo}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'export' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white disabled:opacity-50'
              }`}
            >
              Export
            </button>
            <button
              onClick={() => setActiveTab('sync')}
              disabled={!currentProject?.github_repo}
              className={`flex-1 flex justify-center items-center gap-1.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeTab === 'sync' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white disabled:opacity-50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync
            </button>
          </div>

          {activeTab === 'import' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400">
                Import an existing repository into a brand new Workspace. Only <span className="text-blue-400 font-mono">.sol</span> files at the root directory are imported currently.
              </p>
              
              <div className="border border-gray-800 rounded-lg overflow-hidden flex flex-col">
                 <div className="bg-[#1a1a1f] px-3 py-2 border-b border-gray-800 text-xs font-semibold text-gray-400">
                    Your Repositories
                 </div>
                 <div className="max-h-48 overflow-y-auto custom-scrollbar bg-[#121214]">
                    {repos.length === 0 && !isLoading && (
                        <div className="p-4 text-center text-xs text-gray-500 italic">No repositories found.</div>
                    )}
                    {repos.map(r => (
                        <button 
                          key={r.id} 
                          onClick={() => handleImportRepo(r)}
                          disabled={isLoading}
                          className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-[#252526] border-b border-gray-800/50 transition-colors flex justify-between items-center group disabled:opacity-50"
                        >
                            <span className="truncate pr-2">{r.full_name}</span>
                            <Download className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </button>
                    ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">New Repository Name</label>
                <input
                  type="text"
                  value={newRepoName}
                  onChange={(e) => setNewRepoName(e.target.value)}
                  className="w-full bg-[#121214] border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. my-awesome-protocol"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This creates a private repository on your GitHub account, pushing all files from the current Workspace, and linking them for future syncing.
              </p>
              <button
                onClick={handleExport}
                disabled={isLoading || !newRepoName.trim()}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white font-medium flex items-center justify-center gap-2 mt-4 transition-colors"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Export to GitHub
              </button>
            </div>
          )}

          {activeTab === 'sync' && currentProject?.github_repo && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg text-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-1">Linked Repository</p>
                <a href={`https://github.com/${currentProject.github_repo}`} target="_blank" rel="noreferrer" className="font-mono text-blue-400 hover:text-blue-300 transition-colors text-sm truncate block">{currentProject.github_repo}</a>
                <p className="text-[10px] text-gray-500 mt-1.5 uppercase font-medium bg-gray-900/50 inline-block px-2 py-0.5 rounded-full">Branch: {currentProject.github_branch || 'main'}</p>
              </div>

              <div className="bg-[#121214] border border-gray-800 rounded-lg p-3 text-xs text-gray-400 flex items-start gap-2">
                 <Info className="w-4 h-4 text-orange-400 shrink-0" />
                 <p>Pushing will overwrite remote files that match local file names. Note: Recursive folder paths are properly maintained!</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Commit Message</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-[#121214] border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="e.g. Add minting logic to Vault"
                />
              </div>

              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">Files to Sync</label>
                 <div className="max-h-32 overflow-y-auto custom-scrollbar border border-gray-800 rounded-lg bg-[#121214] p-1 space-y-0.5">
                    {localFiles.map(file => (
                       <label key={file.id} className="flex items-center gap-2.5 p-1.5 hover:bg-gray-800/50 rounded cursor-pointer transition-colors group">
                          <input 
                            type="checkbox" 
                            checked={!!selectedSyncFiles[file.id]} 
                            onChange={(e) => setSelectedSyncFiles(p => ({...p, [file.id]: e.target.checked}))}
                            className="bg-gray-900 border-gray-700 rounded text-blue-500 focus:ring-blue-500/30 w-3.5 h-3.5"
                          />
                          <span className="text-xs text-gray-300 font-mono group-hover:text-white truncate">{file.name}</span>
                       </label>
                    ))}
                 </div>
              </div>

              <button
                onClick={handleSync}
                disabled={isLoading || localFiles.filter(f => selectedSyncFiles[f.id]).length === 0}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors mt-2"
              >
                {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Commit & Push Changes
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
