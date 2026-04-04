import React, { useState, useMemo } from 'react';
import { Search, FileCode, FolderOpen } from 'lucide-react';
import { Project, ContractFile } from '../utils/userData';

interface TokenSearchProps {
  projects: Project[];
  onSelectResult: (projectId: string, fileId: string) => void;
}

interface SearchResult {
  project: Project;
  file: ContractFile;
  matchLine?: string;
  lineNumber?: number;
}

const TokenSearch: React.FC<TokenSearchProps> = ({ projects, onSelectResult }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const results = useMemo(() => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    
    const lowerTerm = searchTerm.toLowerCase();
    const found: SearchResult[] = [];

    projects.forEach(project => {
      project.files?.forEach(file => {
        // Search by file name
        if (file.name.toLowerCase().includes(lowerTerm)) {
          found.push({ project, file });
          return;
        }

        // Search by content
        if (file.content) {
          const lines = file.content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(lowerTerm)) {
              found.push({
                project,
                file,
                matchLine: lines[i].trim(),
                lineNumber: i + 1
              });
              // Limit matches to first found per file to avoid flooding
              break; 
            }
          }
        }
      });
    });

    return found;
  }, [projects, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-[#252526] text-[#cccccc] overflow-hidden select-none border-r border-[#2d2d2d]">
      <div className="px-4 py-3 border-b border-[#2d2d2d] flex flex-col gap-3 bg-[#1e1e1e]">
        <span className="text-[11px] font-bold uppercase tracking-widest text-[#858585]">Global Search</span>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-3.5 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search all files and projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full bg-[#3c3c3c] border border-transparent rounded px-2 pl-7 py-1.5 text-xs text-white focus:outline-none focus:border-[#007acc] transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {searchTerm.length > 0 && searchTerm.length < 2 ? (
          <div className="text-center p-4 text-[10px] text-gray-500">Type at least 2 characters...</div>
        ) : results.length === 0 && searchTerm.length >= 2 ? (
          <div className="text-center p-8 text-[10px] text-gray-500">No matching files or code found.</div>
        ) : (
          <div className="flex flex-col gap-1">
            {results.map((result, idx) => (
              <div 
                key={`${result.project.id}-${result.file.id}-${idx}`}
                onClick={() => onSelectResult(result.project.id, result.file.id)}
                className="group cursor-pointer rounded p-2 hover:bg-[#2a2d2e] transition-colors flex flex-col gap-1 border border-transparent hover:border-[#3c3c3c]"
              >
                <div className="flex items-center gap-1.5 mt-0.5">
                  <FileCode className="size-3.5 text-[#007acc]" />
                  <span className="text-xs font-mono text-[#cccccc] group-hover:text-white transition-colors">{result.file.name}</span>
                </div>
                
                <div className="flex items-center gap-1 pl-5 text-[9px] text-[#858585]">
                  <FolderOpen className="size-3" />
                  <span>{result.project.name}</span>
                </div>

                {result.matchLine && (
                  <div className="mt-1 pl-5">
                    <div className="bg-[#1e1e1e] p-1.5 rounded text-[10px] font-mono text-gray-400 overflow-hidden text-ellipsis whitespace-nowrap border border-[#333]">
                      <span className="text-blue-400 select-none mr-2">{result.lineNumber}:</span>
                      {result.matchLine}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenSearch;
