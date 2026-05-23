import React, { useState } from 'react';
import { 
  FolderTree, 
  FileCode, 
  Trash2, 
  Clock, 
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FilePlus2,
  FolderPlus,
  Home
} from 'lucide-react';
import { Project, ContractFile } from '../utils/userData';

interface ExplorerProps {
  projects: Project[];
  currentProjectId?: string;
  activeFileId?: string;
  onSelectProject: (p: Project) => void;
  onCreateProject: () => void;
  onSelectFile: (projectId: string, file: ContractFile) => void;
  onAddFile: (projectId: string, parentPath?: string) => void;
  onAddFolder: (projectId: string, parentPath?: string) => void;
  onDeleteFolder?: (projectId: string, folderPath: string) => void;
  onImportWorkspace: (projectId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onCompileFolder?: (projectId: string, folderPath: string) => void;
  onCompileWorkspace?: (projectId: string) => void;
}

const ProjectExplorer: React.FC<ExplorerProps> = ({ 
  projects, currentProjectId, activeFileId, 
  onSelectProject, onCreateProject, onSelectFile, onAddFile, onAddFolder, onDeleteFolder, onImportWorkspace, onDeleteFile, onDeleteProject,
  onCompileFolder, onCompileWorkspace
}) => {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Record<string, boolean>>({});
  // Track expanded state for nested folders: key = `${projectId}::${folderPath}`
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, type: 'folder' | 'workspace', id: string, path?: string } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, type: 'folder' | 'workspace', id: string, path?: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, path });
  };

  const closeContextMenu = () => setContextMenu(null);

  React.useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, []);

  const toggleWorkspace = (id: string) => {
    setExpandedWorkspaces(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  // Build a tree from flat file array
  type FileNode = { name: string; file?: ContractFile; children: Record<string, FileNode> };
  const buildTree = (files: ContractFile[]): FileNode => {
    const root: FileNode = { name: 'root', children: {} };
    files.forEach(file => {
      const parts = file.name.split('/');
      let current = root;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) { // It's a file
          current.children[part] = { name: part, file, children: {} };
        } else { // It's a folder
          if (!current.children[part]) {
            current.children[part] = { name: part, children: {} };
          }
          current = current.children[part];
        }
      }
    });
    return root;
  };

  // Recursive render component for the file tree
  const renderTree = (node: FileNode, path: string, projectId: string, depth: number = 0) => {
    const entries = Object.values(node.children)
      .filter(child => child.name !== '.keep' || !child.file) // Hide .keep files
      .sort((a, b) => {
        // Folders first, then alphabetical
        const aIsFolder = !a.file;
        const bIsFolder = !b.file;
        if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return entries.map(child => {
      const currentPath = path ? `${path}/${child.name}` : child.name;
      const folderId = `${projectId}::${currentPath}`;
      const isExpanded = expandedFolders[folderId]; // default close or open? maybe open by default can be nice, but state empty means closed

      if (child.file) {
        // Render File
        return (
          <div 
            key={child.file.id}
            onClick={() => onSelectFile(projectId, child.file!)}
            style={{ paddingLeft: `${(depth * 12) + 8}px` }}
            className={`group h-7 flex items-center justify-between cursor-pointer rounded transition-all ${
              activeFileId === child.file.id ? 'bg-[#007acc]/10 text-white' : 'hover:bg-gray-800/30 text-gray-600'
            }`}
          >
             <div className="flex items-center gap-2 min-w-0 pr-2">
                <FileCode className={`size-3.5 shrink-0 ${activeFileId === child.file.id ? 'text-[#007acc]' : 'text-gray-700'}`} />
                <span className={`text-[10.5px] font-medium truncate ${activeFileId === child.file.id ? 'text-[#cccccc]' : 'text-gray-400 group-hover:text-gray-300'}`}>
                   {child.name}
                </span>
             </div>
             <button 
              onClick={(e) => { e.stopPropagation(); onDeleteFile(child.file!.id); }}
              className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
              title="Delete File"
             >
                <Trash2 className="size-3" />
             </button>
          </div>
        );
      } else {
        // Render Folder
        return (
          <div key={folderId}>
            <div 
              onClick={() => toggleFolder(folderId)}
              onContextMenu={(e) => handleContextMenu(e, 'folder', projectId, currentPath)}
              style={{ paddingLeft: `${(depth * 12) + 8}px` }}
              className="group h-7 pr-2 flex items-center justify-between cursor-pointer rounded hover:bg-gray-800/30 transition-all text-gray-500 hover:text-gray-300"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {isExpanded ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
                <FolderOpen className={`size-3 shrink-0 ${isExpanded ? 'text-blue-400/70' : 'text-gray-600'}`} />
                <span className="text-[10.5px] font-bold truncate tracking-tight">{child.name}</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddFile(projectId, currentPath); }}
                  className="p-1 text-gray-600 hover:text-blue-400 hover:bg-blue-600/10 rounded transition-all"
                  title="New File in this folder"
                >
                  <FilePlus2 className="size-3" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onAddFolder(projectId, currentPath); }}
                  className="p-1 text-gray-600 hover:text-yellow-400 hover:bg-yellow-600/10 rounded transition-all"
                  title="New Sub-folder"
                >
                  <FolderPlus className="size-3" />
                </button>
                {onDeleteFolder && (
                   <button 
                     onClick={(e) => { e.stopPropagation(); onDeleteFolder(projectId, currentPath); }}
                     className="p-1 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                     title="Delete Folder"
                   >
                     <Trash2 className="size-3" />
                   </button>
                )}
              </div>
            </div>
            {isExpanded && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                 {renderTree(child, currentPath, projectId, depth + 1)}
              </div>
            )}
          </div>
        );
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950/20 font-sans">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-950/30">
        <div className="flex items-center gap-2">
          <FolderOpen className="size-3.5 text-[#007acc]" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-500">Explorer</span>
        </div>
        <div className="flex items-center gap-1 relative">
           <button 
            onClick={onCreateProject}
            className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-600 hover:text-[#cccccc]"
            title="New Workspace"
          >
            <FolderPlus className="size-4" />
          </button>
        </div>
      </div>

      {/* Projects List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {projects.length === 0 ? (
          <div className="p-8 text-center animate-in fade-in duration-700">
            <FolderTree className="h-10 w-10 text-gray-950 mx-auto mb-3 opacity-20" />
            <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest leading-loose">No active workspaces.<br/>Initialize a new project.</p>
          </div>
        ) : (
          <div className="space-y-1 px-2 pb-4">
            {projects.map((project) => (
              <div key={project.id} className="flex flex-col animate-in slide-in-from-left-2 duration-300">
                {/* 📂 Workspace Folder Header */}
                <div 
                  className={`group h-8 px-2 flex items-center justify-between cursor-pointer rounded transition-all ${
                    currentProjectId === project.id ? 'bg-[#2d2d2d] text-white' : 'hover:bg-gray-800/40 text-gray-500'
                  }`}
                  onClick={() => {
                    onSelectProject(project);
                    toggleWorkspace(project.id);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, 'workspace', project.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {expandedWorkspaces[project.id] ? <ChevronDown className="size-3 text-gray-600" /> : <ChevronRight className="size-3 text-gray-600" />}
                    <div className="flex items-center gap-2 shrink-0">
                       <Home className={`size-3.5 ${currentProjectId === project.id ? 'text-blue-400' : 'text-gray-700'}`} />
                    </div>
                    <span className="text-[11px] font-black truncate tracking-tight uppercase">
                      {project.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAddFile(project.id); }}
                      className="p-1 text-gray-600 hover:text-blue-400 hover:bg-blue-600/10 rounded transition-all"
                      title="New File"
                    >
                      <FilePlus2 className="size-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onAddFolder(project.id); }}
                      className="p-1 text-gray-600 hover:text-yellow-400 hover:bg-yellow-600/10 rounded transition-all"
                      title="New Folder"
                    >
                      <FolderPlus className="size-3.5" />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onImportWorkspace(project.id); }}
                      className="p-1 text-gray-600 hover:text-green-400 hover:bg-green-600/10 rounded transition-all"
                      title="Import Files/Folders"
                    >
                      <FileCode className="size-3.5" /> 
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                      className="p-1 text-gray-700 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                      title="Delete Workspace"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* 📄 Workspace Files (Nested Tree) */}
                {(expandedWorkspaces[project.id] || currentProjectId === project.id) && project.files && (
                  <div className="ml-2 mt-0.5 space-y-0.5 mb-1 animate-in slide-in-from-top-1 duration-200">
                    {project.files.length === 0 ? (
                      <p className="text-[9px] text-gray-800 font-bold italic py-1 pl-4">No contracts yet.</p>
                    ) : (
                      renderTree(buildTree(project.files), '', project.id)
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-gray-900 bg-gray-950/40">
         <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-[0.2em] text-[#444]">
            <div className="flex items-center gap-2">
               <Clock className="size-3" />
               <span>Last Sync: Just Now</span>
            </div>
            <div className="flex items-center gap-1">
               <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
               <span className="text-green-900/60 font-black">Connected</span>
            </div>
         </div>
      </div>
      {/* Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-[#252526] border border-[#454545] shadow-2xl rounded py-1 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === 'folder' && (
            <button 
              onClick={() => { onCompileFolder?.(contextMenu.id, contextMenu.path!); closeContextMenu(); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-blue-400 hover:bg-[#094771] hover:text-white flex items-center gap-2"
            >
              <FileCode className="size-3.5" /> Compile Folder
            </button>
          )}
          {contextMenu.type === 'workspace' && (
            <button 
              onClick={() => { onCompileWorkspace?.(contextMenu.id); closeContextMenu(); }}
              className="w-full text-left px-3 py-1.5 text-[11px] text-blue-400 hover:bg-[#094771] hover:text-white flex items-center gap-2"
            >
              <FileCode className="size-3.5" /> Compile Workspace
            </button>
          )}
          <div className="h-px bg-gray-800 my-1" />
          <button 
            onClick={() => { 
                if (contextMenu.type === 'folder') onDeleteFolder?.(contextMenu.id, contextMenu.path!);
                else onDeleteProject(contextMenu.id);
                closeContextMenu();
            }}
            className="w-full text-left px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-900/20 flex items-center gap-2"
          >
            <Trash2 className="size-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectExplorer;
