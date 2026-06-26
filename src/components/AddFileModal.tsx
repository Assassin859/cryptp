import React, { useState } from 'react';
import { 
  FilePlus, 
  X, 
  FileCode, 
  Coins, 
  Zap, 
  ShieldCheck, 
  Award,
  ChevronRight,
  FileText
} from 'lucide-react';
import { allTemplates } from '../utils/contractTemplates';

interface AddFileModalProps {
  onClose: () => void;
  onConfirm: (fileName: string, templateId: string) => void;
  folderPath?: string;
}

const AddFileModal: React.FC<AddFileModalProps> = ({ onClose, onConfirm, folderPath }) => {
  const [fileName, setFileName] = useState('NewContract');
  const [selectedTemplate, setSelectedTemplate] = useState('empty');

  // Add an "Empty" template to the list for this modal context
  const displayTemplates = [
    { id: 'empty', name: 'Empty Contract', code: '// SPDX-License-Identifier: MIT\npragma solidity 0.8.20;\n\ncontract NewContract {\n    \n}' },
    ...allTemplates
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;
    
    let finalFileName = fileName.trim();
    if (!finalFileName.endsWith('.sol')) finalFileName += '.sol';
    
    onConfirm(finalFileName, selectedTemplate);
  };

  const getTemplateIcon = (id: string) => {
    switch (id) {
      case 'empty': return <FileText className="size-4 text-gray-500" />;
      case 'erc20': return <Coins className="size-4 text-yellow-400" />;
      case 'burnable': return <Zap className="size-4 text-blue-400" />;
      case 'erc721': return <Award className="size-4 text-purple-400" />;
      case 'multisig': return <ShieldCheck className="size-4 text-green-400" />;
      default: return <FileCode className="size-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e1e1e] border border-[#333] rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2d2d2d] flex items-center justify-between bg-[#252526]">
           <div className="flex items-center gap-3">
              <div className="bg-[#007acc] p-1.5 rounded-lg">
                <FilePlus className="size-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">New Contract</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                    {folderPath ? `Adding to ${folderPath}` : 'Root Directory'}
                </p>
              </div>
           </div>
           <button onClick={onClose} className="p-1 hover:bg-[#2d2d2d] rounded-full transition-colors text-gray-500 hover:text-white">
              <X className="size-5" />
           </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* File Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Contract Name</label>
            <div className="relative group">
              <input 
                autoFocus
                type="text" 
                placeholder="e.g. MyToken"
                value={fileName}
                onChange={(e) => setFileName(e.target.value.replace(/\s+/g, ''))}
                className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg p-3 pr-12 text-xs text-[#cccccc] focus:outline-none focus:border-[#007acc] transition-all placeholder:text-[#444]"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-mono text-gray-600 font-bold">.sol</div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
             <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Choose Template</label>
             <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
                {displayTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left group ${
                      selectedTemplate === template.id 
                        ? 'bg-blue-600/10 border-blue-500/50 text-white' 
                        : 'bg-[#252526] border-[#3c3c3c] text-gray-400 hover:border-[#444] hover:bg-[#2d2d2d]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`p-1.5 rounded bg-[#1e1e1e] border border-[#333] ${selectedTemplate === template.id ? 'border-blue-500/30' : ''}`}>
                          {getTemplateIcon(template.id)}
                       </div>
                       <div>
                          <p className="text-[10px] font-bold tracking-tight">{template.name}</p>
                          <p className="text-[8px] text-gray-600 uppercase font-black">
                            {template.id === 'empty' ? 'Minimal' : (template.id === 'erc721' ? 'NFT' : 'Standard')}
                          </p>
                       </div>
                    </div>
                    {selectedTemplate === template.id && <ChevronRight className="size-3 text-blue-500" />}
                  </button>
                ))}
             </div>
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
              disabled={!fileName.trim()}
              className={`flex-1 px-4 py-2.5 text-xs font-bold text-white rounded-lg transition-all shadow-lg shadow-blue-900/20 ${
                fileName.trim() 
                  ? 'bg-[#007acc] hover:bg-blue-500' 
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
             >
                Create Contract
             </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFileModal;
