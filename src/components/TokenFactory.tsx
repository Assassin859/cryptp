import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coins, 
  Zap, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  Flame, 
  PlusCircle, 
  PauseCircle, 
  LayoutGrid, 
  Image as ImageIcon, 
  Database,
  Eye,
  AlertCircle,
  Sparkles,
  Shield,
  Layers,
  Fingerprint
} from 'lucide-react';
import { generateTokenCode, TokenType, AccessControl, TokenOptions } from '../utils/tokenGenerator';

interface TokenFactoryProps {
  onInjectCode: (code: string, type: string) => void;
  onPreview: (code: string, type: string) => void;
}

const TokenFactory: React.FC<TokenFactoryProps> = ({ onInjectCode, onPreview }) => {
  const [tokenType, setTokenType] = useState<TokenType>('ERC20');
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('My Asset');
  const [symbol, setSymbol] = useState('MASSET');
  const [supply, setSupply] = useState('1000000');
  const [cap, setCap] = useState('2000000');
  const [baseUri, setBaseUri] = useState('');
  const [accessControl, setAccessControl] = useState<AccessControl>('Ownable');
  
  const [features, setFeatures] = useState({
    mintable: true,
    burnable: true,
    pausable: false,
    enumerable: false,
    uriStorage: true,
    capped: false,
    flashMinting: false,
    votes: false,
    permit: true,
    supply: true
  });

  const [generatedCode, setGeneratedCode] = useState('');
  const [isLiveSync, setIsLiveSync] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Validation
  const nameError = useMemo(() => {
    if (!name) return "Name is required";
    if (!/^[a-zA-Z][a-zA-Z0-9\s]*$/.test(name)) return "Invalid Solidity identifier";
    return null;
  }, [name]);

  const symbolError = useMemo(() => {
    if (tokenType === 'ERC1155') return null;
    if (!symbol) return "Symbol is required";
    if (!/^[A-Z0-9]{2,8}$/.test(symbol)) return "Must be 2-8 uppercase chars";
    return null;
  }, [symbol, tokenType]);

  const isValid = !nameError && !symbolError;

  const presets = [
    { id: 'defi', name: 'DeFi Legend', desc: 'Capped, Burnable, Permit', type: 'ERC20', features: { mintable: true, burnable: true, permit: true, capped: true, pausable: false } },
    { id: 'gaming', name: 'Gaming Soul', desc: 'ERC1155, Batch Minting', type: 'ERC1155', features: { mintable: true, burnable: true, supply: true, pausable: false } },
    { id: 'dao', name: 'DAO Core', desc: 'Governance, Votes, Roles', type: 'ERC20', accessControl: 'Roles', features: { mintable: true, votes: true, permit: true, pausable: false } },
    { id: 'nft', name: 'Mass Mint NFT', desc: 'ERC721A, Low Gas', type: 'ERC721A', features: { mintable: true, burnable: true, pausable: false } },
  ];

  const applyPreset = (presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;
    
    setTokenType(preset.type as TokenType);
    if (preset.accessControl) setAccessControl(preset.accessControl as AccessControl);
    setFeatures(prev => ({ ...prev, ...preset.features }));
    setActivePreset(presetId);
  };

  useEffect(() => {
    const options: TokenOptions = {
      type: tokenType,
      name,
      symbol,
      supply,
      cap,
      baseUri,
      accessControl,
      features: features as any
    };
    const code = generateTokenCode(options);
    setGeneratedCode(code);
    if (isLiveSync && isValid) {
      onPreview(code, tokenType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenType, name, symbol, supply, cap, baseUri, features, accessControl, isLiveSync, isValid]);

  const toggleFeature = (feature: string) => {
    setFeatures((prev: any) => ({ ...prev, [feature]: !prev[feature] }));
    setActivePreset(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 font-sans selection:bg-blue-500/30">
      {/* Wizard Header */}
      <div className="flex bg-gray-900 border-b border-gray-800 p-1 shrink-0">
         <button 
           onClick={() => setStep(1)}
           className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2 ${step === 1 ? 'bg-blue-600/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
         >
           <Sparkles className="size-3" /> 1. Identity
         </button>
         <button 
           onClick={() => setStep(2)}
           className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2 ${step === 2 ? 'bg-blue-600/10 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
         >
           <Layers className="size-3" /> 2. Extensions
         </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {step === 1 ? (
          <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
            
            {/* Presets Selector */}
            <div className="space-y-2">
               <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block pl-1">Configuration Presets</span>
               <div className="grid grid-cols-2 gap-2">
                  {presets.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${activePreset === p.id ? 'bg-blue-600/10 border-blue-500' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}
                    >
                       <p className={`text-[10px] font-bold ${activePreset === p.id ? 'text-blue-400' : 'text-gray-300'}`}>{p.name}</p>
                       <p className="text-[8px] text-gray-600 italic truncate">{p.desc}</p>
                    </button>
                  ))}
               </div>
            </div>

            {/* Asset Type Selection */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block pl-1">Standard Layer</span>
              <div className="grid grid-cols-4 gap-1.5">
                {(['ERC20', 'ERC721', 'ERC721A', 'ERC1155'] as const).map(type => (
                  <button 
                    key={type}
                    onClick={() => { setTokenType(type); setActivePreset(null); }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      tokenType === type ? 'bg-blue-600/10 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    {type === 'ERC20' && <Coins className="size-3.5 mb-1" />}
                    {type === 'ERC721' && <ImageIcon className="size-3.5 mb-1" />}
                    {type === 'ERC721A' && <Zap className="size-3.5 mb-1 text-orange-400" />}
                    {type === 'ERC1155' && <LayoutGrid className="size-3.5 mb-1" />}
                    <span className="text-[9px] font-bold">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Core Configuration */}
            <div className="space-y-3 bg-gray-900/40 p-3 rounded-xl border border-gray-800/50 backdrop-blur-sm relative overflow-hidden">
               <div className="space-y-1 relative z-10">
                 <label className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Contract Name</span>
                    {nameError && <span className="text-[8px] text-red-500 font-bold flex items-center gap-1"><AlertCircle className="size-2.5" /> {nameError}</span>}
                 </label>
                 <input 
                   type="text" 
                   value={name}
                   onChange={e => setName(e.target.value)}
                   className={`w-full bg-gray-950/80 border rounded px-2 py-1.5 text-xs text-white focus:outline-none transition-colors ${nameError ? 'border-red-500/50' : 'border-gray-800 focus:border-blue-500'}`}
                   placeholder="e.g. My Token"
                 />
               </div>
               
               {tokenType !== 'ERC1155' && (
                 <div className="space-y-1 relative z-10">
                   <label className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Symbol</span>
                      {symbolError && <span className="text-[8px] text-red-500 font-bold flex items-center gap-1"><AlertCircle className="size-2.5" /> {symbolError}</span>}
                   </label>
                   <input 
                     type="text" 
                     value={symbol}
                     onChange={e => setSymbol(e.target.value)}
                     className={`w-full bg-gray-950/80 border rounded px-2 py-1.5 text-xs text-white uppercase focus:outline-none font-mono ${symbolError ? 'border-red-500/50' : 'border-gray-800 focus:border-blue-500'}`}
                     placeholder="e.g. MTK"
                   />
                 </div>
               )}

               {tokenType === 'ERC20' ? (
                 <div className="space-y-1 relative z-10">
                   <label className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Initial Supply</label>
                   <input 
                     type="number" 
                     value={supply}
                     onChange={e => setSupply(e.target.value)}
                     className="w-full bg-gray-950/80 border border-gray-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                   />
                 </div>
               ) : (
                 <div className="space-y-1 relative z-10">
                   <label className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Base METADATA URI</label>
                   <input 
                     type="text" 
                     value={baseUri}
                     onChange={e => setBaseUri(e.target.value)}
                     className="w-full bg-gray-950/80 border border-gray-800 rounded px-2 py-1.5 text-[10px] text-gray-400 focus:outline-none focus:border-blue-500 truncate"
                   />
                 </div>
               )}
            </div>

            {/* Token Preview Card */}
            <div className="p-4 bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5 rounded-2xl shadow-inner animate-in fade-in zoom-in duration-500">
               <div className="flex items-start justify-between">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Asset Preview</p>
                     <h4 className="text-sm font-bold text-white truncate max-w-[120px]">{name || 'Unnamed Asset'}</h4>
                     <p className="text-[10px] font-mono text-gray-500">{tokenType === 'ERC1155' ? 'Multi-Token' : symbol || 'TKN'}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-full border border-white/5">
                     {tokenType === 'ERC20' && <Coins className="size-6 text-yellow-400" />}
                     {tokenType === 'ERC721' && <ImageIcon className="size-6 text-purple-400" />}
                     {tokenType === 'ERC721A' && <Zap className="size-6 text-orange-400" />}
                     {tokenType === 'ERC1155' && <LayoutGrid className="size-6 text-blue-400" />}
                  </div>
               </div>
               <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">{tokenType}</span>
                  {features.mintable && <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 text-[8px] font-black uppercase tracking-tighter border border-green-500/20">Mintable</span>}
                  {features.burnable && <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 text-[8px] font-black uppercase tracking-tighter border border-red-500/20">Burnable</span>}
                  {accessControl === 'Roles' && <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-300 text-[8px] font-black uppercase tracking-tighter border border-orange-500/20">RBAC</span>}
               </div>
            </div>

            <button 
              onClick={() => setStep(2)}
              disabled={!isValid}
              className={`w-full py-2.5 rounded text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all shadow-lg ${
                isValid ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              Logical Extensions <ArrowRight className="size-3" />
            </button>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-2 duration-300">
            
            {/* Access Control Selection */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block pl-1">Access Protocol</span>
              <div className="grid grid-cols-2 gap-2">
                 <button 
                  onClick={() => { setAccessControl('Ownable'); setActivePreset(null); }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all relative ${accessControl === 'Ownable' ? 'bg-blue-600/10 border-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                 >
                    <Shield className={`size-4 ${accessControl === 'Ownable' ? 'text-blue-400' : 'text-gray-700'}`} />
                    <div className="text-left">
                       <p className={`text-[10px] font-bold ${accessControl === 'Ownable' ? 'text-white' : 'text-gray-500'}`}>Ownable</p>
                       <p className="text-[8px] text-gray-700 font-medium tracking-tight">Single Admin <span className="text-orange-500/70 font-bold">(-15 pts)</span></p>
                    </div>
                 </button>
                 <button 
                  onClick={() => { setAccessControl('Roles'); setActivePreset(null); }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all relative ${accessControl === 'Roles' ? 'bg-blue-600/10 border-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                 >
                    <Fingerprint className={`size-4 ${accessControl === 'Roles' ? 'text-blue-400' : 'text-gray-700'}`} />
                    <div className="text-left">
                       <p className={`text-[10px] font-bold ${accessControl === 'Roles' ? 'text-white' : 'text-gray-500'}`}>Roles (RBAC)</p>
                       <p className="text-[8px] text-green-500/70 font-bold tracking-tight">Decentralized PRD</p>
                    </div>
                 </button>
              </div>
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block pl-1 italic">Extension Layers</span>
            
            <div className="grid grid-cols-1 gap-1.5">
              <ToggleRow id="mintable" active={features.mintable} toggle={() => toggleFeature('mintable')} icon={<PlusCircle className="size-3.5" />} title="Mintable" desc="Dynamic supply generation" />
              <ToggleRow id="burnable" active={features.burnable} toggle={() => toggleFeature('burnable')} icon={<Flame className="size-3.5" />} title="Burnable" desc="Permanent supply reduction" />
              <ToggleRow id="pausable" active={features.pausable} toggle={() => toggleFeature('pausable')} icon={<PauseCircle className="size-3.5" />} title="Pausable" desc="Emergency transfer circuit-break" />
              
              {(tokenType === 'ERC20') && (
                <>
                  <ToggleRow id="capped" active={features.capped} toggle={() => toggleFeature('capped')} icon={<ShieldCheck className="size-3.5" />} title="Capped" desc="Hard max-supply enforcement" />
                  <ToggleRow id="permit" active={features.permit} toggle={() => toggleFeature('permit')} icon={<Zap className="size-3.5" />} title="Permit" desc="Gasless approvals (EIP-2612)" />
                  <ToggleRow id="votes" active={features.votes} toggle={() => toggleFeature('votes')} icon={<LayoutGrid className="size-3.5" />} title="Governance" desc="Stake & Vote capabilities" />
                </>
              )}

              {tokenType === 'ERC721' && (
                <>
                  <ToggleRow id="uri" active={features.uriStorage} toggle={() => toggleFeature('uriStorage')} icon={<Database className="size-3.5" />} title="URI Storage" desc="Dynamic metadata for every NFT" />
                  <ToggleRow id="enum" active={features.enumerable} toggle={() => toggleFeature('enumerable')} icon={<LayoutGrid className="size-3.5" />} title="Enumerable" desc="On-chain inventory discovery" />
                </>
              )}
            </div>
            
            {features.capped && tokenType === 'ERC20' && (
               <div className="p-3 bg-blue-600/5 border border-blue-500/20 rounded-xl animate-in slide-in-from-top-1">
                  <label className="text-[9px] font-black uppercase text-blue-400 mb-1 block">Maximum Supply Cap</label>
                  <input 
                    type="number" 
                    value={cap}
                    onChange={e => setCap(e.target.value)}
                    className="w-full bg-gray-950 border border-blue-500/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                  />
               </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-gray-900 border-t border-gray-800 space-y-2 shrink-0">
          <div className="flex items-center justify-between px-1 mb-1">
              <div className="flex items-center gap-2">
                 <div className={`size-2 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                 <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{isValid ? 'Config Valid' : 'Incomplete'}</span>
              </div>
              <button 
                onClick={() => setIsLiveSync(!isLiveSync)}
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all ${isLiveSync ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-600'}`}
              >
                  <div className={`size-1 rounded-full ${isLiveSync ? 'bg-blue-400' : 'bg-gray-600'}`} />
                  <span className="text-[8px] font-black uppercase">Live Sync</span>
              </button>
          </div>

          <button 
            disabled={!isValid}
            onClick={() => onPreview(generatedCode, tokenType)}
            className={`w-full py-1.5 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${isValid ? 'text-blue-500 hover:text-blue-400' : 'text-gray-700 cursor-not-allowed'}`}
          >
            <Eye className="size-3" /> Focus Draft in Editor
          </button>
          
          <button 
            disabled={!isValid}
            onClick={() => onInjectCode(generatedCode, tokenType)}
            className={`w-full py-3 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl ${
              isValid ? 'bg-[#007acc] hover:bg-blue-500 text-white shadow-blue-500/20' : 'bg-gray-800 text-gray-600 cursor-not-allowed border border-white/5'
            }`}
          >
            <Zap className={`size-4 ${isValid ? 'text-white' : 'text-gray-700'}`} /> Inject Implementation
          </button>
      </div>
    </div>
  );
};

const ToggleRow = ({ active, toggle, icon, title, desc }: any) => (
  <div 
    onClick={toggle}
    className={`group flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
      active ? 'bg-blue-600/5 border-blue-500/30' : 'bg-gray-900 border-gray-800/50 hover:border-gray-700'
    }`}
  >
    <div className={`p-2 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-950 text-gray-700'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'}`}>
          {title}
        </span>
        <div className={`size-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
          active ? 'bg-blue-500 border-blue-400' : 'bg-gray-950 border-gray-800'
        }`}>
          {active && <Check className="size-2.5 text-white stroke-[4]" />}
        </div>
      </div>
      <p className="text-[8px] text-gray-600 italic truncate tracking-tight">{desc}</p>
    </div>
  </div>
);

export default TokenFactory;
