import React, { useState } from 'react';
import { X, Github, Chrome, Zap, GitBranch, LayoutGrid, Loader2 } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface LinkIdentityModalProps {
  onClose: () => void;
}

const LinkIdentityModal: React.FC<LinkIdentityModalProps> = ({ onClose }) => {
  const [linkingProvider, setLinkingProvider] = useState<'github' | 'google' | null>(null);

  const handleLinkIdentity = async (provider: 'github' | 'google') => {
    try {
      setLinkingProvider(provider);
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) {
        console.error("Failed to link identity:", error);
        setLinkingProvider(null);
      }
    } catch (e) {
      console.error(e);
      setLinkingProvider(null);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('cryptp-dismiss-link-modal', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2d2d2d] flex items-center justify-between bg-[#252526]">
           <div className="flex items-center gap-3">
              <div className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
                <Zap className="size-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Connect Accounts</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Unlock Pro Features</p>
              </div>
           </div>
           <button onClick={handleDismiss} className="p-1 hover:bg-[#2d2d2d] rounded-full transition-colors text-gray-500 hover:text-white">
              <X className="size-5" />
           </button>
        </div>

        <div className="p-6 space-y-6 text-center">
          
          <div>
            <h4 className="text-lg font-bold text-white mb-2">Supercharge your Workflow</h4>
            <p className="text-xs text-gray-400 leading-relaxed max-w-[90%] mx-auto">
              Link your GitHub or Google account to seamlessly synchronize your workspaces, manage repository branches directly from the IDE, and import external dependencies effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
             <div className="bg-[#121214] border border-[#2d2d2d] rounded-lg p-3">
                <GitBranch className="size-4 text-blue-400 mb-2" />
                <h5 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">Repo Sync</h5>
                <p className="text-[9px] text-gray-500">Push & pull contracts to your private repositories.</p>
             </div>
             <div className="bg-[#121214] border border-[#2d2d2d] rounded-lg p-3">
                <LayoutGrid className="size-4 text-purple-400 mb-2" />
                <h5 className="text-[10px] font-bold text-gray-300 uppercase tracking-wider mb-1">Easy Import</h5>
                <p className="text-[9px] text-gray-500">Instantly clone full OpenZeppelin libraries via URL.</p>
             </div>
          </div>

          <div className="pt-2 space-y-3">
             <button 
                onClick={() => handleLinkIdentity('github')}
                disabled={linkingProvider !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#24292e] hover:bg-[#2f363d] text-white rounded-lg text-xs font-bold transition-all shadow-lg border border-[#1b1f23] disabled:opacity-50"
             >
                {linkingProvider === 'github' ? <Loader2 className="size-4 animate-spin"/> : <Github className="size-4" />}
                {linkingProvider === 'github' ? 'Linking to GitHub...' : 'Link GitHub Account (Recommended)'}
             </button>
             
             <button 
                onClick={() => handleLinkIdentity('google')}
                disabled={linkingProvider !== null}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all shadow-lg border border-gray-200 disabled:opacity-50"
             >
                {linkingProvider === 'google' ? <Loader2 className="size-4 animate-spin"/> : <Chrome className="size-4" />}
                {linkingProvider === 'google' ? 'Linking to Google...' : 'Link Google Account'}
             </button>
          </div>

          <button 
             onClick={handleDismiss}
             className="text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors mt-2"
          >
             Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkIdentityModal;
