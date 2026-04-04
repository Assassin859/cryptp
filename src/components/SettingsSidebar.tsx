import React, { useState } from 'react';
import { Settings, LogOut, Github, Chrome, Mail, User as UserIcon, Loader2, Key, Bot, Database, DownloadCloud, Trash2, Eye, EyeOff } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabaseClient';

interface SettingsSidebarProps {
  user: User | null;
  onSignOut: () => void;
  onBeforeIdentityLink?: () => Promise<void>;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ user, onSignOut, onBeforeIdentityLink }) => {
  const [linkingProvider, setLinkingProvider] = useState<'github' | 'google' | null>(null);

  const [aiKeys, setAiKeys] = useState<Record<string, string>>({});
  const [rpcKeys, setRpcKeys] = useState<Record<string, string>>({});

  // Scoped key helper
  const getScopedKey = (base: string) => user ? `${base}-${user.id}` : base;

  React.useEffect(() => {
    if (!user) return;
    
    // Migration Logic: Move global keys to scoped keys if scoped don't exist
    const globalAiKey = 'cryptp-ai-keys';
    const globalRpcKey = 'cryptp-rpc-keys';
    const scopedAiKey = getScopedKey(globalAiKey);
    const scopedRpcKey = getScopedKey(globalRpcKey);
    
    let currentAi = localStorage.getItem(scopedAiKey);
    let currentRpc = localStorage.getItem(scopedRpcKey);
    
    if (!currentAi && localStorage.getItem(globalAiKey)) {
       currentAi = localStorage.getItem(globalAiKey);
       localStorage.setItem(scopedAiKey, currentAi!);
       localStorage.removeItem(globalAiKey); // Privacy cleanup
    }
    
    if (!currentRpc && localStorage.getItem(globalRpcKey)) {
       currentRpc = localStorage.getItem(globalRpcKey);
       localStorage.setItem(scopedRpcKey, currentRpc!);
       localStorage.removeItem(globalRpcKey); // Privacy cleanup
    }
    
    try { 
      setAiKeys(JSON.parse(currentAi || '{"openai":"","gemini":"","claude":"","copilot":""}')); 
    } catch { setAiKeys({}); }
    
    try { 
      setRpcKeys(JSON.parse(currentRpc || '{"alchemy":"","infura":"","etherscan":""}')); 
    } catch { setRpcKeys({}); }
    
  }, [user]);

  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const [isSavingKeys, setIsSavingKeys] = useState(false);

  const saveKeysToCloud = async () => {
     if (!user) return;
     setIsSavingKeys(true);
     try {
       localStorage.setItem(getScopedKey('cryptp-rpc-keys'), JSON.stringify(rpcKeys));
       localStorage.setItem(getScopedKey('cryptp-ai-keys'), JSON.stringify(aiKeys));

       const { error } = await supabase.from('user_settings').upsert({
         user_id: user.id,
         rpc_keys: rpcKeys,
         ai_keys: aiKeys,
         updated_at: new Date().toISOString()
       });
       
       if (error) throw error;
     } catch (e: any) {
       console.error("Cloud Sync Error", e);
       alert("Error saving keys: " + e.message);
     } finally {
       setIsSavingKeys(false);
     }
  };

  const deleteKeysFromCloud = async () => {
     if (!user) return;
     if (!confirm("Are you sure you want to permanently delete your API keys from the cloud and device?")) return;
     
     setRpcKeys({});
     setAiKeys({});
     localStorage.removeItem(getScopedKey('cryptp-rpc-keys'));
     localStorage.removeItem(getScopedKey('cryptp-ai-keys'));
     
     try {
       await supabase.from('user_settings').delete().eq('user_id', user.id);
     } catch(e) {}
  };

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-gray-950/20 font-sans p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="size-4 text-gray-500" />
          <h2 className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">Settings</h2>
        </div>
        <p className="text-[10px] text-gray-500">Loading user profile...</p>
      </div>
    );
  }

  const meta = user.user_metadata || {};
  const appMeta = user.app_metadata || {};

  // Extract external identities if multiple exist
  const identities = user.identities || [];
  const hasGithub = identities.some(i => i.provider === 'github');
  const hasGoogle = identities.some(i => i.provider === 'google');

  let name = meta.full_name || meta.name;
  let username = meta.user_name || null;
  let avatarUrl = meta.avatar_url || null;
  const email = user.email || meta.email || 'No Email';
  const provider = appMeta.provider || 'email';
  
  // If the user signed up via email first, their root metadata is empty. 
  // We can pull the display name and avatar from their newly linked identities!
  if (!name || !avatarUrl || !username) {
     for (const identity of identities) {
        const idData = identity.identity_data || {};
        if (!name && (idData.full_name || idData.name)) name = idData.full_name || idData.name;
        if (!avatarUrl && (idData.avatar_url || idData.picture)) avatarUrl = idData.avatar_url || idData.picture;
        if (!username && idData.user_name) username = idData.user_name;
     }
  }

  name = name || 'Anonymous User';

  const handleLinkIdentity = async (provider: 'github' | 'google') => {
    try {
      setLinkingProvider(provider);
      if (onBeforeIdentityLink) {
        await onBeforeIdentityLink();
      }
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

  return (
    <div className="flex flex-col h-full bg-gray-950/20 font-sans">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50 bg-gray-950/30 shrink-0">
        <div className="flex items-center gap-2">
          <Settings className="size-3.5 text-gray-400" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">Settings & Profile</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
        
        {/* Profile Card */}
        <div className="bg-[#121214] border border-gray-800/50 rounded-xl overflow-hidden shadow-2xl relative">
           <div className="h-12 bg-gradient-to-r from-blue-600/20 to-purple-600/20 w-full absolute top-0 left-0 border-b border-gray-800/50"></div>
           <div className="p-4 pt-8 relative flex flex-col items-center">
              {avatarUrl ? (
                 <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full border-[3px] border-[#1e1e1e] shadow-lg mb-2 z-10" />
              ) : (
                 <div className="w-16 h-16 rounded-full bg-blue-500/10 border-[3px] border-[#1e1e1e] flex items-center justify-center shadow-lg mb-2 z-10">
                    <UserIcon className="size-6 text-blue-500" />
                 </div>
              )}
              
              <h2 className="text-sm font-bold text-white text-center pb-0.5">{name}</h2>
              {username && (
                <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 font-mono tracking-tight hover:underline mb-2">@{username}</a>
              )}
              
              <div className="flex items-center gap-1.5 mt-2 bg-black/40 border border-gray-800 rounded-full px-3 py-1">
                 <Mail className="size-3 text-gray-500" />
                 <span className="text-[10px] text-gray-400 truncate max-w-[150px]">{email}</span>
              </div>
           </div>
        </div>

        {/* Authentication Providers Status */}
        <div>
           <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 pl-1">Connected Identities</h3>
           <div className="bg-[#121214] border border-gray-800 rounded-lg overflow-hidden divide-y divide-gray-800/50">
              
              <div className="p-3 flex items-center justify-between">
                 <div className="flex items-center gap-2.5">
                    <Github className={`size-4 ${hasGithub ? 'text-white' : 'text-gray-600'}`} />
                    <div>
                       <p className={`text-[11px] font-bold ${hasGithub ? 'text-gray-300' : 'text-gray-600'}`}>GitHub Account</p>
                       {provider === 'github' && <p className="text-[9px] text-blue-400 mt-0.5 font-medium uppercase">Primary Login</p>}
                    </div>
                 </div>
                 {hasGithub ? (
                    <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-widest">Linked</span>
                 ) : (
                    <button 
                       onClick={() => handleLinkIdentity('github')}
                       disabled={linkingProvider !== null}
                       className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                       {linkingProvider === 'github' ? <><Loader2 className="size-3 animate-spin"/> Linking...</> : 'Link Account'}
                    </button>
                 )}
              </div>

              <div className="p-3 flex items-center justify-between">
                 <div className="flex items-center gap-2.5">
                    <Chrome className={`size-4 ${hasGoogle ? 'text-white' : 'text-gray-600'}`} />
                    <div>
                       <p className={`text-[11px] font-bold ${hasGoogle ? 'text-gray-300' : 'text-gray-600'}`}>Google Account</p>
                       {provider === 'google' && <p className="text-[9px] text-blue-400 mt-0.5 font-medium uppercase">Primary Login</p>}
                    </div>
                 </div>
                 {hasGoogle ? (
                    <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-widest">Linked</span>
                 ) : (
                    <button 
                       onClick={() => handleLinkIdentity('google')}
                       disabled={linkingProvider !== null}
                       className="text-[9px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/20 font-bold uppercase tracking-widest transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                       {linkingProvider === 'google' ? <><Loader2 className="size-3 animate-spin"/> Linking...</> : 'Link Account'}
                    </button>
                 )}
              </div>

              {!hasGithub && !hasGoogle && provider === 'email' && (
                 <div className="p-3 flex items-center justify-between">
                 <div className="flex items-center gap-2.5">
                    <Mail className="size-4 text-white" />
                    <div>
                       <p className="text-[11px] font-bold text-gray-300">Email & Password</p>
                       <p className="text-[9px] text-blue-400 mt-0.5 font-medium uppercase">Primary Login</p>
                    </div>
                 </div>
                 <span className="text-[9px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded border border-green-500/20 font-bold uppercase tracking-widest">Active</span>
              </div>
              )}

           </div>
           {!hasGithub && (
              <p className="text-[10px] text-blue-400/80 mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg leading-relaxed flex items-start gap-2">
                 <strong className="text-blue-400 font-black tracking-widest uppercase">Pro Tip:</strong> Link your GitHub account above to instantly unlock the ability to import, clone, and sync smart contract repositories directly from your remote branches!
              </p>
           )}
        </div>

        {/* RPC & API Keys */}
        <div>
           <div className="relative group inline-block w-full">
             <h3 className="text-[10px] font-black uppercase text-gray-500 hover:text-blue-400 transition-colors tracking-widest mb-2 pl-1 flex items-center gap-1.5 cursor-help">
               <Database className="size-3" /> Blockchain APIs
             </h3>
             <div className="absolute left-1 bottom-full mb-1 hidden group-hover:block w-[95%] bg-[#0f172a] text-blue-200 text-[10px] p-2.5 rounded-lg border border-blue-500/30 shadow-2xl z-50 animate-in fade-in zoom-in-95">
               These keys provide direct node access, allowing you to deploy contracts to public testnets, verify code with Etherscan, and request accurate mainnet gas estimations.
             </div>
           </div>
           <div className="bg-[#121214] border border-gray-800 rounded-lg p-3 space-y-3">
              {[ { id: 'alchemy', name: 'Alchemy RPC Key' }, { id: 'infura', name: 'Infura API Key' }, { id: 'etherscan', name: 'Etherscan Pro Key' } ].map(provider => (
                <div key={provider.id}>
                  <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mb-1 block">{provider.name}</label>
                  <div className="relative">
                    <input 
                      type={visibleKey === provider.id ? "text" : "password"}
                      value={rpcKeys[provider.id] || ''}
                      onChange={(e) => setRpcKeys({...rpcKeys, [provider.id]: e.target.value})}
                      placeholder="Enter provider key..."
                      className="w-full bg-[#1e1e1e] border border-[#333] rounded p-2 text-[11px] font-mono text-gray-300 focus:outline-none focus:border-blue-500 transition-colors pr-8"
                    />
                    <button onClick={() => setVisibleKey(visibleKey === provider.id ? null : provider.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {visibleKey === provider.id ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
           </div>
        </div>

        {/* AI Model Keys */}
        <div>
           <div className="relative group inline-block w-full">
             <h3 className="text-[10px] font-black uppercase text-gray-500 hover:text-purple-400 transition-colors tracking-widest mb-2 pl-1 flex items-center gap-1.5 cursor-help">
               <Bot className="size-3" /> Advanced AI Integration
             </h3>
             <div className="absolute left-1 bottom-full mb-1 hidden group-hover:block w-[95%] bg-[#1e102f] text-purple-200 text-[10px] p-2.5 rounded-lg border border-purple-500/30 shadow-2xl z-50 animate-in fade-in zoom-in-95">
               Bring your own API keys to supercharge the AI Chat. Your keys never leave your browser, ensuring maximum privacy while letting the Assistant audit and optimize your code.
             </div>
           </div>
           <p className="text-[9px] text-gray-500 mb-3 pl-1 leading-tight">Bring your own keys to unlock localized AI features like contract auditing and auto-completion without backend proxies.</p>
           <div className="bg-[#121214] border border-gray-800 rounded-lg p-3 space-y-3">
              {[ { id: 'openai', name: 'OpenAI (ChatGPT)' }, { id: 'gemini', name: 'Google Gemini' }, { id: 'claude', name: 'Anthropic Claude' }, { id: 'copilot', name: 'GitHub Copilot' } ].map(provider => (
                <div key={provider.id}>
                  <label className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mb-1 block">{provider.name}</label>
                  <div className="relative">
                    <input 
                      type={visibleKey === provider.id ? "text" : "password"}
                      value={aiKeys[provider.id] || ''}
                      onChange={(e) => setAiKeys({...aiKeys, [provider.id]: e.target.value})}
                      placeholder="sk-..."
                      className="w-full bg-[#1e1e1e] border border-[#333] rounded p-2 text-[11px] font-mono text-gray-300 focus:outline-none focus:border-purple-500 transition-colors pr-8"
                    />
                    <button onClick={() => setVisibleKey(visibleKey === provider.id ? null : provider.id)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                      {visibleKey === provider.id ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
           </div>

           {/* Cloud Sync Controller */}
           <div className="flex items-center gap-2 mt-4 pt-1">
             <button onClick={saveKeysToCloud} disabled={isSavingKeys} className="flex-1 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/50 text-purple-300 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
               {isSavingKeys ? <Loader2 className="size-3.5 animate-spin" /> : <DownloadCloud className="size-3.5" />} {isSavingKeys ? 'Syncing...' : 'Save'}
             </button>
             <button onClick={deleteKeysFromCloud} className="flex-1 px-3 py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-500/10 text-red-400 rounded text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2" title="Delete API Keys">
               <Trash2 className="size-3.5" /> Delete
             </button>
           </div>
        </div>

        {/* Data & Privacy */}
        <div>
           <h3 className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2 pl-1 flex items-center gap-1.5"><Key className="size-3" /> Data & Privacy</h3>
           <div className="space-y-2">
             <button onClick={() => alert("Downloading Workspace (Mock)...")} className="w-full flex items-center justify-between p-3 rounded-lg bg-[#121214] border border-gray-800 hover:border-gray-600 transition-colors group">
                <div className="text-left">
                   <p className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors">Download Workspace</p>
                   <p className="text-[9px] text-gray-500">Export as .zip archive</p>
                </div>
                <DownloadCloud className="size-4 text-gray-500 group-hover:text-white transition-colors" />
             </button>
             <button onClick={() => alert("Erasing Account (Mock)...")} className="w-full flex items-center justify-between p-3 rounded-lg bg-red-950/10 border border-red-900/30 hover:bg-red-950/30 transition-colors group">
                <div className="text-left">
                   <p className="text-[11px] font-bold text-red-500">Erase Account</p>
                   <p className="text-[9px] text-red-500/70">Permanently wipe all data</p>
                </div>
                <Trash2 className="size-4 text-red-500/50 group-hover:text-red-500 transition-colors" />
             </button>
           </div>
        </div>

      </div>

      <div className="p-4 border-t border-gray-900 bg-[#1e1e1e]">
         <button 
           onClick={onSignOut}
           className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all font-bold text-[11px] uppercase tracking-widest"
         >
           <LogOut className="size-3.5" /> Secure Sign Out
         </button>
      </div>

    </div>
  );
};

export default SettingsSidebar;
