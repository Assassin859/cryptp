import React, { useEffect } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDangerous = false,
  onConfirm,
  onCancel,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className={`bg-[#1e1e1e] border rounded-xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-150 ${isDangerous ? 'border-red-500/30' : 'border-white/10'}`}>
        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-3">
          {isDangerous
            ? <AlertTriangle className="size-5 text-red-400 shrink-0" />
            : <Info className="size-5 text-blue-400 shrink-0" />
          }
          <h3 className={`text-[15px] font-black tracking-tight ${isDangerous ? 'text-red-400' : 'text-white'}`}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <p className="text-[13px] text-[#858585] mb-6 leading-relaxed whitespace-pre-line pl-8">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-white/5 rounded-lg text-[12px] font-bold text-gray-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg text-[12px] font-bold transition-colors ${
              isDangerous
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-[#007acc] hover:bg-[#1a8fe0] text-white'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
