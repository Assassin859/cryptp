import React, { useState, useEffect } from 'react';
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
  Eye
} from 'lucide-react';

type TokenType = 'ERC20' | 'ERC721' | 'ERC1155';

interface TokenFactoryProps {
  onInjectCode: (code: string, type: TokenType) => void;
  onPreview: (code: string, type: TokenType) => void;
}

const TokenFactory: React.FC<TokenFactoryProps> = ({ onInjectCode, onPreview }) => {
  const [tokenType, setTokenType] = useState<TokenType>('ERC20');
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('My Asset');
  const [symbol, setSymbol] = useState('MASSET');
  const [supply, setSupply] = useState('1000000');
  const [cap, setCap] = useState('2000000');
  const [baseUri, setBaseUri] = useState('https://api.example.com/metadata/');
  
  const [features, setFeatures] = useState({
    mintable: true,
    burnable: true,
    pausable: false,
    enumerable: false,
    uriStorage: true,
    royalties: false,
    capped: false,
    flashMinting: false,
    votes: false
  });

  const [generatedCode, setGeneratedCode] = useState('');
  const [isLiveSync, setIsLiveSync] = useState(false);

  const generateCode = () => {
    const { mintable, burnable, pausable, enumerable, uriStorage, capped, flashMinting, votes } = features;
    
    let imports = [];
    let inheritances = [];
    let constructorArgs = [];
    let constructorArgsSuper = [];
    let constructorBody = '';

    if (tokenType === 'ERC20') {
      imports.push('import "@openzeppelin/contracts/token/ERC20/ERC20.sol";');
      inheritances.push('ERC20');
      if (burnable) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";');
        inheritances.push('ERC20Burnable');
      }
      if (pausable) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";');
        inheritances.push('ERC20Pausable');
      }
      
      constructorArgs.push(`uint256 initialSupply`);
      constructorBody = `_mint(msg.sender, initialSupply * 10 ** decimals());`;

      if (capped) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";');
        inheritances.push('ERC20Capped');
        constructorArgs.push(`uint256 maxCap`);
        constructorArgsSuper.push(`ERC20Capped(maxCap * 10 ** decimals())`);
      }

      if (flashMinting) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20FlashMint.sol";');
        inheritances.push('ERC20FlashMint');
      }

      if (votes) {
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";');
        imports.push('import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";');
        inheritances.push('ERC20Permit', 'ERC20Votes');
        constructorArgsSuper.push(`ERC20Permit("${name}")`);
      }
      
    } else if (tokenType === 'ERC721') {
      imports.push('import "@openzeppelin/contracts/token/ERC721/ERC721.sol";');
      inheritances.push('ERC721');
      if (enumerable) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";');
        inheritances.push('ERC721Enumerable');
      }
      if (uriStorage) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";');
        inheritances.push('ERC721URIStorage');
      }
      if (burnable) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";');
        inheritances.push('ERC721Burnable');
      }
      if (pausable) {
        imports.push('import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol";');
        inheritances.push('ERC721Pausable');
      }
    } else if (tokenType === 'ERC1155') {
      imports.push('import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";');
      inheritances.push('ERC1155');
    }

    if (mintable || pausable || features.royalties) {
      imports.push('import "@openzeppelin/contracts/access/Ownable.sol";');
      inheritances.push('Ownable');
    }

    let code = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

${[...new Set(imports)].join('\n')}

contract ${name.replace(/\s+/g, '')} is ${inheritances.join(', ')} {
    constructor(${constructorArgs.join(', ')}) 
        ${tokenType === 'ERC20' ? `ERC20("${name}", "${symbol}")` : ''}
        ${constructorArgsSuper.join('\n        ')}
        ${tokenType === 'ERC721' ? `ERC721("${name}", "${symbol}")` : ''}
        ${tokenType === 'ERC1155' ? `ERC1155("${baseUri}")` : ''}
        ${(mintable || pausable || features.royalties) ? 'Ownable(msg.sender)' : ''}
    {
        ${constructorBody}
    }
}`;
    return code;
  };

  useEffect(() => {
    const code = generateCode();
    setGeneratedCode(code);
    if (isLiveSync) {
      onPreview(code, tokenType);
    }
  }, [tokenType, name, symbol, supply, cap, baseUri, features, isLiveSync]);

  const toggleFeature = (feature: keyof typeof features) => {
    setFeatures((prev: any) => ({ ...prev, [feature]: !prev[feature] }));
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 font-sans selection:bg-blue-500/30">
      {/* Wizard Header */}
      <div className="flex bg-gray-900 border-b border-gray-800 p-1 shrink-0">
         <button 
           onClick={() => setStep(1)}
           className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${step === 1 ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
         >
           1. Asset Identity
         </button>
         <button 
           onClick={() => setStep(2)}
           className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded transition-all ${step === 2 ? 'bg-gray-800 text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
         >
           2. Logic extensions
         </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {step === 1 ? (
          <div className="space-y-4 animate-in slide-in-from-left-2 duration-300">
            {/* Asset Type Selection */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block pl-1">Standard</span>
              <div className="grid grid-cols-3 gap-1.5">
                {(['ERC20', 'ERC721', 'ERC1155'] as const).map(type => (
                  <button 
                    key={type}
                    onClick={() => setTokenType(type)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      tokenType === type ? 'bg-blue-600/10 border-blue-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-700'
                    }`}
                  >
                    {type === 'ERC20' && <Coins className="size-4 mb-1" />}
                    {type === 'ERC721' && <ImageIcon className="size-4 mb-1" />}
                    {type === 'ERC1155' && <LayoutGrid className="size-4 mb-1" />}
                    <span className="text-[10px] font-bold">{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Core Configuration */}
            <div className="space-y-3 bg-gray-900/50 p-3 rounded-lg border border-gray-800/50">
               <div className="space-y-1">
                 <label className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Contract Name</label>
                 <input 
                   type="text" 
                   value={name}
                   onChange={e => setName(e.target.value)}
                   className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                   placeholder="e.g. My Token"
                 />
               </div>
               
               {tokenType !== 'ERC1155' && (
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Symbol</label>
                   <input 
                     type="text" 
                     value={symbol}
                     onChange={e => setSymbol(e.target.value)}
                     className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-xs text-white uppercase focus:outline-none focus:border-blue-500 font-mono"
                     placeholder="e.g. MTK"
                   />
                 </div>
               )}

               {tokenType === 'ERC20' ? (
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Initial Supply</label>
                   <input 
                     type="number" 
                     value={supply}
                     onChange={e => setSupply(e.target.value)}
                     className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                   />
                 </div>
               ) : (
                 <div className="space-y-1">
                   <label className="text-[9px] font-bold uppercase text-gray-500 tracking-tighter">Base METADATA URI</label>
                   <input 
                     type="text" 
                     value={baseUri}
                     onChange={e => setBaseUri(e.target.value)}
                     className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1.5 text-[10px] text-gray-400 focus:outline-none focus:border-blue-500 truncate"
                   />
                 </div>
               )}
            </div>

            <button 
              onClick={() => setStep(2)}
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition"
            >
              Configure Logic extensions <ArrowRight className="size-3" />
            </button>

            <div className="flex items-center justify-between p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-blue-400">Live Editor Preview</span>
                <span className="text-[8px] text-gray-600 italic">Sync changes instantly to Monaco</span>
              </div>
              <button 
                onClick={() => setIsLiveSync(!isLiveSync)}
                className={`w-10 h-5 rounded-full relative transition-colors ${isLiveSync ? 'bg-blue-600' : 'bg-gray-800'}`}
              >
                <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${isLiveSync ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in slide-in-from-right-2 duration-300">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block pl-1 italic">Security & Extension layers</span>
            
            <div className="grid grid-cols-1 gap-1">
              <ToggleRow id="mintable" active={features.mintable} toggle={() => toggleFeature('mintable')} icon={<PlusCircle className="size-3.5" />} title="Mintable" desc="Allow creating new tokens later" />
              <ToggleRow id="burnable" active={features.burnable} toggle={() => toggleFeature('burnable')} icon={<Flame className="size-3.5" />} title="Burnable" desc="Destroy tokens permanently" />
              <ToggleRow id="pausable" active={features.pausable} toggle={() => toggleFeature('pausable')} icon={<PauseCircle className="size-3.5" />} title="Pausable" desc="Stop all transfers in emergency" />
              
              {tokenType === 'ERC20' && (
                <>
                  <ToggleRow id="capped" active={features.capped} toggle={() => toggleFeature('capped')} icon={<ShieldCheck className="size-3.5" />} title="Capped" desc="Set a maximum supply limit" />
                  <ToggleRow id="flashMint" active={features.flashMinting} toggle={() => toggleFeature('flashMinting')} icon={<Zap className="size-3.5" />} title="Flash Mint" desc="Support for uncollateralized loans" />
                  <ToggleRow id="votes" active={features.votes} toggle={() => toggleFeature('votes')} icon={<LayoutGrid className="size-3.5" />} title="Governance" desc="On-chain voting capabilities" />
                </>
              )}

              {tokenType === 'ERC721' && (
                <>
                  <ToggleRow id="uri" active={features.uriStorage} toggle={() => toggleFeature('uriStorage')} icon={<Database className="size-3.5" />} title="Full URI Storage" desc="Custom metadata for every NFT" />
                  <ToggleRow id="enum" active={features.enumerable} toggle={() => toggleFeature('enumerable')} icon={<LayoutGrid className="size-3.5" />} title="Enumerable" desc="On-chain discoverability of IDs" />
                </>
              )}
            </div>
            
            {features.capped && tokenType === 'ERC20' && (
               <div className="p-2 bg-blue-500/5 border border-blue-500/20 rounded-md animate-in slide-in-from-top-1">
                  <label className="text-[8px] font-black uppercase text-blue-400 mb-1 block">Maximum Supply Cap</label>
                  <input 
                    type="number" 
                    value={cap}
                    onChange={e => setCap(e.target.value)}
                    className="w-full bg-gray-950/50 border border-blue-500/30 rounded px-2 py-1 text-xs text-white focus:outline-none"
                  />
               </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 bg-gray-900 border-t border-gray-800 space-y-2 shrink-0">
          <button 
            onClick={() => onPreview(generatedCode, tokenType)}
            className="w-full py-1.5 text-blue-500 hover:text-blue-400 text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors"
          >
            <Eye className="size-3" /> Focus Draft in Editor
          </button>
          <button 
            onClick={() => onInjectCode(generatedCode, tokenType)}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded font-black uppercase tracking-[0.1em] text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 transition-all active:scale-95"
          >
            <Zap className="size-3.5" /> Inject Implementation
          </button>
      </div>

      {/* Preview overlay removed in favor of direct Monaco integration */}
    </div>
  );
};

const ToggleRow = ({ active, toggle, icon, title, desc }: any) => (
  <div 
    onClick={toggle}
    className={`group flex items-center gap-3 p-2 rounded-md border transition-all cursor-pointer ${
      active ? 'bg-blue-600/5 border-blue-500/30' : 'bg-gray-900 border-gray-800/50 hover:border-gray-700'
    }`}
  >
    <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-600'}`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'text-blue-400' : 'text-gray-400 group-hover:text-gray-300'}`}>
          {title}
        </span>
        <div className={`size-3 rounded-sm border shrink-0 flex items-center justify-center transition-all ${
          active ? 'bg-blue-500 border-blue-400' : 'bg-gray-950 border-gray-700'
        }`}>
          {active && <Check className="size-2 text-white stroke-[4]" />}
        </div>
      </div>
      <p className="text-[8px] text-gray-600 italic truncate">{desc}</p>
    </div>
  </div>
);

export default TokenFactory;
