import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Sparkles, 
  Trash2, 
  Zap, 
  ShieldCheck, 
  Code2, 
  Send,
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { User } from '@supabase/supabase-js';
import { Project } from '../utils/userData';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  user: User | null;
  currentProject: Project | null;
  activeFileId?: string;
  activeFileCode?: string;
  onUpdateCode?: (code: string) => void;
  onCreateFile?: (name: string, content: string) => void;
  onCompile?: () => void;
  onDeploy?: () => void;
  compileResult?: any;
  securityReport?: any;
  initialPrompt?: { prompt: string, theme: string } | null;
  onPromptConsumed?: () => void;
}

const AIChat: React.FC<AIChatProps> = ({ 
  user,
  currentProject, 
  activeFileId, 
  activeFileCode, 
  onUpdateCode, 
  onCreateFile,
  onCompile,
  onDeploy,
  compileResult,
  securityReport,
  initialPrompt,
  onPromptConsumed
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I am your **Elite CryptP Architect & Cybersecurity Lead**. I can help you analyze your Solidity contracts for security vulnerabilities, perform gas optimizations, or assist with architectural redesigns. How can I help you build today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (initialPrompt && initialPrompt.prompt) {
      const runInitial = async () => {
        const userMsg: Message = { 
          role: 'user', 
          content: `[System Triggered (${initialPrompt.theme})]: ${initialPrompt.prompt}`, 
          timestamp: new Date() 
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);
        
        const response = await askAI(initialPrompt.prompt);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        }]);
        setIsTyping(false);
        if (onPromptConsumed) onPromptConsumed();
      };
      runInitial();
    }
  }, [initialPrompt]);

  // Read keys to determine available models
  let aiKeys: any = {};
  if (typeof window !== 'undefined' && user) {
    try {
      const scopedKey = `cryptp-ai-keys-${user.id}`;
      aiKeys = JSON.parse(localStorage.getItem(scopedKey) || '{}');
    } catch {
      aiKeys = {};
    }
  }
  const availableModels: any[] = [];
  if (aiKeys.openai) availableModels.push({ id: 'openai', name: 'OpenAI (GPT-4o)' });
  if (aiKeys.gemini) availableModels.push({ id: 'gemini', name: 'Google Gemini' });

  const [selectedModel, setSelectedModel] = useState<string>('');
  const activeModel = availableModels.find(m => m.id === selectedModel) ? selectedModel : (availableModels[0]?.id || '');
  const aiDisplayName = activeModel ? availableModels.find(m => m.id === activeModel)?.name : "CryptP Assistant";

  const askAI = async (prompt: string) => {
     if (!activeModel) {
       return "🔒 **Feature Disabled:** This feature will be available after you provide your OpenAI or Google Gemini API keys in the Settings Panel.";
     }

     let workspaceContext = "";
     if (currentProject) {
        workspaceContext += `\nWorkspace: ${currentProject.name}`;
        const files = currentProject.files || [];
        if (files.length > 0) {
          workspaceContext += `\n\n--- WORKSPACE FILES ---`;
          files.forEach((f: any) => {
            workspaceContext += `\nFile: ${f.name}\nContent:\n${f.content}\n---`;
          });
        }
     }

     if (compileResult) {
        workspaceContext += `\n\n--- RECENT COMPILATION STATE ---`;
        workspaceContext += `\nSuccess: ${compileResult.success}`;
        if (!compileResult.success && compileResult.errors) {
          workspaceContext += `\nErrors:\n${compileResult.errors.map((e: any) => e.formattedMessage || e.message).join('\n')}`;
        }
     }

     if (securityReport) {
        workspaceContext += `\n\n--- RECENT SECURITY AUDIT ---`;
        workspaceContext += `\nSafety Score: ${securityReport.score ?? 'N/A'}/100`;
        const vulnerabilities = securityReport.vulnerabilities || [];
        workspaceContext += `\nVulnerabilities Found: ${vulnerabilities.length}`;
        vulnerabilities.slice(0, 5).forEach((v: any) => {
          workspaceContext += `\n- [${v.severity}] ${v.type}: ${v.description} (Line ${v.line})`;
        });
     }

     if (activeFileId && activeFileCode) {
        const activeFileName = currentProject?.files?.find((f: any) => f.id === activeFileId)?.name || 'Unknown';
        workspaceContext += `\n\n--- FOCUSSED FILE: ${activeFileName} ---\n${activeFileCode}\n-------------------------`;
     }

     const systemPrompt = `You are the **Elite CryptP Architect**, an expert-level autonomous agent.
Your goal is to provide **extreme conciseness** and high-fidelity technical precision.

Core Rules:
- **Be Extremely Brief**: Never use 10 words if 2 will do. Avoid long introductions or summaries.
- **Executive Insight**: Start every technical response with a **one-sentence** maximum insight inside a [!TIP] block.
- **Bullet Points**: Use concise bullets for reasoning.
- **Agentic**: If a fix is needed, output the action protocol immediately without a long explanation.
- **Markdown**: Use headers and bold sparingly for readability.
- **No Pragma Locks**: Use ^0.8.0.

--- WORKSPACE CONTEXT ---
${workspaceContext}

--- ACTION PROTOCOL ---
Supported Actions:
1. "UPDATE_ACTIVE_FILE": Replaces active editor tab code.
2. "CREATE_FILE": Creates a new workspace file.
3. "COMPILE_CURRENT": Triggers a build.
4. "DEPLOY_SIMULATION": Deploys to EVM sandbox.

Action Example:
\`\`\`action
[ { "action": "COMPILE_CURRENT" } ]
\`\`\`

--- RESPONSE STRATEGY ---
Insight -> Concise Bullets -> Action (if any).`;
     const fullPrompt = systemPrompt + "\n\nUser Request: " + prompt;

     try {
       if (activeModel === 'gemini') {
         const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${aiKeys.gemini}`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
         });
         const data = await res.json();
         if (data.error) throw new Error(data.error.message);
         return data.candidates[0].content.parts[0].text;
       } else if (activeModel === 'openai') {
         const res = await fetch('https://api.openai.com/v1/chat/completions', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiKeys.openai}` },
             body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{role: 'system', content: systemPrompt}, {role: 'user', content: prompt}] })
         });
         const data = await res.json();
         if (data.error) throw new Error(data.error.message);
         return data.choices[0].message.content;
       }
     } catch (err: any) {
       return `⚠️ AI Provider Error: ${err.message}. Please check your API key in Settings!`;
     }
     return "No valid AI configuration.";
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const responseContent = await askAI(input);
    
    // Parse actions
    const actionRegex = /```action\n([\s\S]*?)\n```/g;
    let match;
    while ((match = actionRegex.exec(responseContent)) !== null) {
        try {
          const rawAction = match[1].trim();
          const actionData = JSON.parse(rawAction);
          const actions = Array.isArray(actionData) ? actionData : [actionData];
          
          for (const item of actions) {
            if (item.action === 'UPDATE_ACTIVE_FILE' && onUpdateCode) {
               onUpdateCode(item.content);
            } else if (item.action === 'CREATE_FILE' && onCreateFile) {
               onCreateFile(item.name || 'NewContract.sol', item.content);
            } else if (item.action === 'COMPILE_CURRENT' && onCompile) {
               onCompile();
            } else if (item.action === 'DEPLOY_SIMULATION' && onDeploy) {
               onDeploy();
            }
          }
       } catch (e: any) {
          console.error("Action parsing failed", e);
          try {
            const potentialJsonStr = match[1].substring(match[1].indexOf('{'), match[1].lastIndexOf('}') + 1);
            if (potentialJsonStr) {
               const actionData = JSON.parse(potentialJsonStr);
               if (actionData.action === 'UPDATE_ACTIVE_FILE' && onUpdateCode) {
                  onUpdateCode(actionData.content);
               }
            }
          } catch(e2) {}
       }
    }

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: responseContent,
      timestamp: new Date()
    }]);
    setIsTyping(false);
  };

  const runSmartAction = async (type: 'explain' | 'gas' | 'audit') => {
     let prompt = "";
     if (type === 'explain') prompt = "Analyze the logic of the current active file and give me an architectural overview.";
     if (type === 'gas') prompt = "Perform a deep gas analysis on the current contract and suggest specific assembly or storage optimizations.";
     if (type === 'audit') prompt = "Run a security audit on the current project and flag any high-severity vulnerabilities like reentrancy or overflow.";
     
     const userMsg: Message = { role: 'user', content: `[Smart Action]: ${type.toUpperCase()}`, timestamp: new Date() };
     setMessages(prev => [...prev, userMsg]);
     setIsTyping(true);
     
     const response = await askAI(prompt);
     setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: new Date()
     }]);
     setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#2d2d2d] shadow-2xl overflow-hidden font-sans">
      {/* 🚀 Header */}
      <div className="h-12 bg-[#252526] border-b border-[#2d2d2d] flex items-center justify-between px-4 shrink-0">
         <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-400" />
            <h2 className="text-xs font-black uppercase tracking-[0.15em] text-[#cccccc]">Assistant</h2>
         </div>
         <div className="flex items-center gap-3">
            {availableModels.length > 0 ? (
              <select 
                value={selectedModel} 
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#1e1e1e] border border-[#333] text-[10px] text-[#858585] rounded px-2 py-0.5 outline-none focus:border-blue-500/50"
              >
                {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            ) : (
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#858585]">{activeModel ? availableModels[0].name : "CryptP Assistant"}</span>
            )}
         </div>
         <button onClick={() => setMessages([messages[0]])} className="p-1 hover:bg-[#2d2d2d] rounded transition-colors text-[#858585] hover:text-red-400">
            <Trash2 className="size-3.5" />
         </button>
      </div>

      {/* 🛠️ Smart Actions Cabinet */}
      {availableModels.length > 0 && (
      <div className="p-2 border-b border-[#2d2d2d] bg-[#252526]/50 flex flex-wrap gap-2 shrink-0">
         <button onClick={() => runSmartAction('explain')} className="flex items-center gap-1.5 px-2 py-1 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[9px] font-bold text-[#cccccc] rounded border border-[#444] transition-all">
            <Code2 className="size-3 text-blue-400" /> Explain Logic
         </button>
         <button onClick={() => runSmartAction('gas')} className="flex items-center gap-1.5 px-2 py-1 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[9px] font-bold text-[#cccccc] rounded border border-[#444] transition-all">
            <Zap className="size-3 text-yellow-400" /> Optimize Gas
         </button>
         <button onClick={() => runSmartAction('audit')} className="flex items-center gap-1.5 px-2 py-1 bg-[#2d2d2d] hover:bg-[#3c3c3c] text-[9px] font-bold text-[#cccccc] rounded border border-[#444] transition-all">
            <ShieldCheck className="size-3 text-green-400" /> Security Audit
         </button>
      </div>
      )}

      {/* 💬 Message History */}
      {availableModels.length > 0 ? (
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
         {messages.map((msg: any, idx: number) => (
            <div key={idx} className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start animate-in fade-in slide-in-from-bottom-1'}`}>
               <div className="flex items-center gap-2 mb-1">
                  {msg.role === 'assistant' && <div className="size-5 bg-blue-500/20 border border-blue-500/30 rounded flex items-center justify-center"><Bug className="size-3 text-blue-400" /></div>}
                  <span className="text-[10px] font-black uppercase text-[#858585] tracking-widest">{msg.role === 'assistant' ? aiDisplayName : 'Me'}</span>
               </div>
               <div className={`max-w-[90%] p-3 text-[11px] leading-6 rounded-xl border shadow-2xl transition-all ${
                 msg.role === 'user' 
                   ? 'bg-blue-600/10 border-blue-500/20 text-[#cccccc] rounded-tr-none' 
                   : 'bg-[#1a1a1c] border-[#2d2d2d] text-[#e1e2e6] rounded-tl-none font-sans prose prose-invert prose-xs max-w-none'
               }`}>
                 {msg.role === 'assistant' ? (
                   <ReactMarkdown 
                     remarkPlugins={[remarkGfm]}
                     components={{
                       p: ({children}: any) => {
                         const childrenArray = React.Children.toArray(children);
                         const firstChild = childrenArray[0];
                         
                         // Check if the first child starts with a GitHub-style alert marker
                         if (typeof firstChild === 'string' && firstChild.trim().startsWith('[!')) {
                            const match = firstChild.match(/\[!(TIP|NOTE|IMPORTANT|CAUTION|WARNING)\]/);
                            if (match) {
                               const alertType = match[1];
                               const iconMap: Record<string, string> = { TIP: '💡', IMPORTANT: '🔥', NOTE: '📝', CAUTION: '⚠️', WARNING: '⚡' };
                               const colorMap: Record<string, string> = { TIP: 'blue', IMPORTANT: 'red', NOTE: 'gray', CAUTION: 'orange', WARNING: 'yellow' };
                               
                               const cleanedFirstChild = firstChild.replace(/\[!(TIP|NOTE|IMPORTANT|CAUTION|WARNING)\]/, "").trim();
                               
                               return (
                                 <div className={`p-4 my-6 rounded-xl bg-${colorMap[alertType]}-500/10 border border-${colorMap[alertType]}-500/20 flex items-start gap-4 shadow-2xl relative overflow-hidden`}>
                                    <div className={`absolute top-0 left-0 w-1 h-full bg-${colorMap[alertType]}-500/50`}></div>
                                    <span className="text-lg shrink-0 mt-0.5">{iconMap[alertType]}</span>
                                    <div className="text-[11px] leading-6 flex-1 text-[#e1e2e6]">
                                       <strong className={`text-${colorMap[alertType]}-400 font-black uppercase tracking-[0.2em] block mb-2 text-[9px]`}>{alertType}</strong>
                                       {cleanedFirstChild}
                                       {childrenArray.slice(1)}
                                    </div>
                                 </div>
                               );
                            }
                         }
                         return <p className="mb-4 last:mb-0 leading-relaxed text-[#cccccc]">{children}</p>;
                       },
                       blockquote: ({children}: any) => (
                         <div className="border-l-4 border-blue-500/50 pl-4 py-1 my-4 bg-blue-500/5 rounded-r">
                            {children}
                         </div>
                       ),
                       code: ({children}: any) => <code className="bg-[#2d2d2d] px-1.5 py-0.5 rounded text-orange-400 font-mono text-[10px] border border-white/5">{children}</code>,
                       pre: ({children}: any) => <div className="bg-[#0f0f10] p-3 rounded-lg my-4 border border-[#333] overflow-x-auto shadow-inner">{children}</div>,
                       ul: ({children}: any) => <ul className="list-disc pl-5 space-y-2 my-4">{children}</ul>,
                       li: ({children}: any) => <li className="text-[10.5px] font-medium leading-relaxed">{children}</li>,
                       h1: ({children}: any) => <h1 className="text-base font-black mb-4 text-white border-b border-gray-800 pb-2 mt-6 uppercase tracking-wider">{children}</h1>,
                       h2: ({children}: any) => <h2 className="text-xs font-black mb-3 text-white border-b border-gray-800 pb-1 mt-6 uppercase tracking-widest">{children}</h2>,
                       h3: ({children}: any) => <h3 className="text-[11px] font-bold mb-2 text-blue-400 uppercase tracking-tight mt-4">{children}</h3>,
                       strong: ({children}: any) => <strong className="font-black text-white">{children}</strong>
                     }}
                   >
                     {msg.content.replace(/```action\n[\s\S]*?\n```/g, "").trim()}
                   </ReactMarkdown>
                 ) : (
                   <span className="whitespace-pre-wrap">{msg.content}</span>
                 )}
               </div>
            </div>
         ))}
         {isTyping && (
           <div className="flex items-center gap-2 text-[#858585] animate-pulse">
              <RefreshCw className="size-3 animate-spin" />
              <span className="text-[9px] font-bold uppercase tracking-widest">Thinking...</span>
           </div>
         )}
      </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center space-y-4 custom-scrollbar bg-[#1e1e1e]">
         <div className="size-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center shadow-lg">
            <Zap className="size-8 text-blue-500/70" />
         </div>
         <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-white">Add AI Keys</h3>
            <p className="text-xs text-[#858585] max-w-xs leading-relaxed">
               Please navigate to the <strong className="text-white border-b border-[#444] pb-0.5">Settings</strong> panel and provision your OpenAI or Google Gemini keys to unlock the assistant.
            </p>
         </div>
      </div>
      )}

      {/* ⌨️ User Input */}
      <div className="h-16 bg-[#252526] border-t border-[#2d2d2d] flex items-center gap-2 px-3 shrink-0">
         <div className="flex-1 relative">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg px-3 py-2 text-[11px] text-[#cccccc] focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-[#4d4d4d]" 
              placeholder="Ask the Architect..."
            />
            <Send className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-[#4d4d4d] hover:text-blue-400 cursor-pointer transition-colors" onClick={handleSend} />
         </div>
      </div>
    </div>
  );
};

export default AIChat;
