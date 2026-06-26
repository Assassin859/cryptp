import React, { useState } from 'react';
import { FolderPlus, X } from 'lucide-react';
import { Github } from 'lucide-react';

interface NewWorkspaceModalProps {
  onClose: () => void;
  onCreate: (workspaceName: string) => void;
  onOpenGitHubImport?: () => void;
}

const NewWorkspaceModal: React.FC<NewWorkspaceModalProps> = ({ onClose, onCreate, onOpenGitHubImport }) => {
  const [workspaceName, setWorkspaceName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    
    onCreate(workspaceName.trim());
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2d2d2d] flex items-center justify-between bg-[#252526]">
           <div className="flex items-center gap-3">
              <div className="bg-[#007acc] p-1.5 rounded-lg">
                <FolderPlus className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">New Workspace</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Repository Setup</p>
              </div>
           </div>
           <button onClick={onClose} className="p-1 hover:bg-[#2d2d2d] rounded-full transition-colors text-gray-500 hover:text-white">
              <X className="size-5" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {onOpenGitHubImport && (
            <div className="flex flex-col mb-4 bg-[#121214] border border-[#3c3c3c] rounded-lg p-3 relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-1 h-full bg-[#007acc]"></div>
               <div className="flex items-center justify-between ml-2">
                 <div>
                   <p className="text-xs font-bold text-white uppercase tracking-wider">Already have a repo?</p>
                   <p className="text-[10px] text-gray-400 mt-0.5">Quickly import contracts directly from GitHub.</p>
                 </div>
                 <button type="button" onClick={onOpenGitHubImport} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] hover:border-gray-500 rounded-lg text-xs font-bold text-white transition-colors shadow-lg">
                   <Github className="w-3.5 h-3.5" /> Import
                 </button>
               </div>
            </div>
          )}

          {/* Workspace Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Workspace Name</label>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. MyDeFiProject"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-3 text-xs text-[#cccccc] focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]/40 transition-all placeholder:text-[#444]"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex gap-3">
             <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white bg-transparent border border-[#333] hover:border-[#444] rounded-lg transition-all"
             >
                Cancel
             </button>
             <button 
              type="submit"
              disabled={!workspaceName.trim()}
              className={`flex-1 px-4 py-2.5 text-xs font-bold text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 ${
                workspaceName.trim() 
                  ? 'bg-[#007acc] hover:bg-blue-500' 
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
             >
                Initialize Workspace
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewWorkspaceModal;
