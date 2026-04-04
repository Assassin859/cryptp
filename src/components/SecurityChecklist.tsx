import React, { useState } from 'react';
import { 
  Circle, 
  ShieldAlert, 
  Check,
  UserMinus,
  Lock,
  HardDrive
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'owner-renounced',
    title: 'Ownership Renounced',
    description: 'Ensure ownership is transferred after deployment.',
    icon: <UserMinus className="h-3 w-3" />
  },
  {
    id: 'liquidity-locked',
    title: 'Liquidity Locked',
    description: 'Initial liquidity should be protocol-locked.',
    icon: <Lock className="h-3 w-3" />
  },
  {
    id: 'supply-capped',
    title: 'Supply Verification',
    description: 'Verify no hidden minting functions exist.',
    icon: <HardDrive className="h-3 w-3" />
  },
  {
    id: 'logic-verified',
    title: 'Logic Verification',
    description: 'Manual review of non-standard logic.',
    icon: <ShieldAlert className="h-3 w-3" />
  },
  {
    id: 'dao-timelock',
    title: 'DAO Timelock',
    description: 'Admin functions use a 24h Timelock.',
    icon: <ShieldAlert className="h-3 w-3" />
  },
  {
    id: 'access-control',
    title: 'Access Control',
    description: 'Roles/ACL are favored over single-owner.',
    icon: <UserMinus className="h-3 w-3" />
  }
];

interface SecurityChecklistProps {
  isPanelMode?: boolean;
}

const SecurityChecklist: React.FC<SecurityChecklistProps> = ({ isPanelMode = false }) => {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);

  const toggleItem = (id: string) => {
    setCheckedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const progress = (checkedItems.length / CHECKLIST_ITEMS.length) * 100;

  return (
    <div className={`flex flex-col h-full bg-slate-950/20 ${!isPanelMode ? 'p-6' : 'p-0'} space-y-4`}>
       <div className="flex items-center justify-between gap-4 px-1">
          <div className="flex flex-col">
             <h3 className="text-[10px] font-black text-white flex items-center gap-2 uppercase tracking-widest">
               Ready for Launch?
             </h3>
             <span className="text-[9px] text-gray-600 font-bold uppercase tracking-tight">Manual Verification Steps</span>
          </div>
          <div className="text-[11px] font-black text-indigo-400 font-mono tracking-tighter">
             {checkedItems.length} / {CHECKLIST_ITEMS.length}
          </div>
       </div>

       <div className="relative h-1 bg-gray-800 rounded-full overflow-hidden mx-1">
          <div 
             className="absolute h-full bg-indigo-500 transition-all duration-700 ease-out shadow-[0_0_8px_rgba(99,102,241,0.6)]"
             style={{ width: `${progress}%` }}
          />
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1 overflow-y-auto custom-scrollbar p-1 pb-4">
          {CHECKLIST_ITEMS.map((item) => (
             <div 
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`group p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-3 h-fit ${
                   checkedItems.includes(item.id) 
                      ? 'bg-indigo-600/10 border-indigo-500/30 ring-1 ring-indigo-500/20' 
                      : 'bg-gray-950/40 border-gray-800 hover:border-gray-700'
                }`}
             >
                <div className={`mt-0.5 transition-colors shrink-0 ${checkedItems.includes(item.id) ? 'text-indigo-400' : 'text-gray-700'}`}>
                   {checkedItems.includes(item.id) ? (
                      <div className="p-0.5 bg-indigo-500 rounded-sm text-white">
                         <Check className="h-2.5 w-2.5" />
                      </div>
                   ) : (
                      <Circle className="h-3.5 w-3.5" />
                   )}
                </div>
                <div className="space-y-1 min-w-0">
                   <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className={`text-[10px] p-1 rounded-md shrink-0 ${checkedItems.includes(item.id) ? 'bg-indigo-500/20 text-indigo-300' : 'bg-gray-900 text-gray-700'}`}>
                         {item.icon}
                      </span>
                      <h4 className={`text-[10px] font-bold tracking-tight uppercase transition-colors truncate ${checkedItems.includes(item.id) ? 'text-indigo-100' : 'text-gray-500'}`}>
                         {item.title}
                      </h4>
                   </div>
                   <p className="text-[9px] text-gray-600 leading-snug line-clamp-1 italic group-hover:line-clamp-none transition-all">
                      {item.description}
                   </p>
                </div>
             </div>
          ))}
       </div>

       {isPanelMode && progress === 100 && (
          <div className="pt-2">
             <button 
                onClick={() => {
                   const report = { title: "Audit Log", timestamp: new Date(), checks: checkedItems };
                   const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                   const url = URL.createObjectURL(blob);
                   const a = document.createElement('a');
                   a.href = url;
                   a.download = `report.json`;
                   a.click();
                }}
                className="w-full py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in-95 duration-300 shadow-xl shadow-indigo-500/20"
             >
                Export Audit Report
             </button>
          </div>
       )}
    </div>
  );
};

export default SecurityChecklist;
