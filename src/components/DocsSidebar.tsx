import React from 'react';
import { BookOpen, Database, Bot, ExternalLink, Key } from 'lucide-react';

const DocsSidebar: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-[#252526] font-sans">
      <div className="p-4 space-y-6">
        
        {/* Intro */}
        <div>
           <div className="flex items-center gap-2 mb-2">
             <BookOpen className="size-4 text-blue-400" />
             <h2 className="text-xs font-black uppercase tracking-widest text-[#cccccc]">Integrations Guide</h2>
           </div>
           <p className="text-[10px] text-[#858585] leading-relaxed">
             The CryptP IDE allows you to bring your own API keys to unlock advanced mainnet deployments and local AI capabilities. Here's a quick guide on how to obtain them.
           </p>
        </div>

        {/* Blockchain APIs */}
        <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl overflow-hidden shadow-lg">
           <div className="bg-[#2d2d2d] px-3 py-2 border-b border-[#3c3c3c] flex items-center gap-2">
              <Database className="size-3.5 text-orange-400" />
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">Blockchain Providers</h3>
           </div>
           <div className="p-3 space-y-3 divide-y divide-[#2d2d2d]">
              
              <div className="pt-2">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-300">Alchemy RPC</span>
                    <a href="https://dashboard.alchemy.com/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold">
                       Get Key <ExternalLink className="size-2.5" />
                    </a>
                 </div>
                 <p className="text-[9px] text-[#858585]">Required for ultra-fast, reliable multi-chain node RPC endpoints. Go to Apps -{'>'} Create App -{'>'} API Key.</p>
              </div>

              <div className="pt-3">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-300">Infura API</span>
                    <a href="https://app.infura.io/dashboard" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold">
                       Get Key <ExternalLink className="size-2.5" />
                    </a>
                 </div>
                 <p className="text-[9px] text-[#858585]">An alternative to Alchemy. Used to instantly proxy IPFS nodes and deploy to Ethereum. Go to My First Key -{'>'} Active Endpoints.</p>
              </div>

              <div className="pt-3">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-300">Etherscan API</span>
                    <a href="https://etherscan.io/myapikey" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-blue-400 hover:text-blue-300 transition-colors uppercase font-bold">
                       Get Key <ExternalLink className="size-2.5" />
                    </a>
                 </div>
                 <p className="text-[9px] text-[#858585]">Required to automatically flatten and verify your smart contracts on block explorers post-deployment.</p>
              </div>

           </div>
        </div>

        {/* AI APIs */}
        <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl overflow-hidden shadow-lg">
           <div className="bg-[#2d2d2d] px-3 py-2 border-b border-[#3c3c3c] flex items-center gap-2">
              <Bot className="size-3.5 text-purple-400" />
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider">AI Code Auditors</h3>
           </div>
           <div className="p-3 space-y-3 divide-y divide-[#2d2d2d]">
              
              <div className="pt-2">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-300">OpenAI (ChatGPT)</span>
                    <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold">
                       Get Key <ExternalLink className="size-2.5" />
                    </a>
                 </div>
                 <p className="text-[9px] text-[#858585]">Enables the GPT-4o-mini code auditor. Requires fetching an 'sk-...' key from the OpenAI developer platform.</p>
              </div>

              <div className="pt-3">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-300">Google Gemini</span>
                    <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold">
                       Get Key <ExternalLink className="size-2.5" />
                    </a>
                 </div>
                 <p className="text-[9px] text-[#858585]">Enables Google's hyper-fast Gemini-Pro auditing system. Currently free via Google AI Studio.</p>
              </div>

              <div className="pt-3">
                 <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-gray-300">Anthropic Claude</span>
                    <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-purple-400 hover:text-purple-300 transition-colors uppercase font-bold">
                       Get Key <ExternalLink className="size-2.5" />
                    </a>
                 </div>
                 <p className="text-[9px] text-[#858585]">Powerful logic verification using the Claude 3.5 Sonnet engine. Fetch from the Anthropic Console.</p>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default DocsSidebar;
