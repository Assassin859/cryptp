import React, { useState, useEffect, useRef } from 'react';
import { PenLine } from 'lucide-react';

interface InputModalProps {
  title: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

const InputModal: React.FC<InputModalProps> = ({
  title,
  label,
  placeholder = '',
  defaultValue = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    // Small delay to let the animation settle
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Keyboard handling
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && value.trim()) onConfirm(value.trim());
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onCancel, onConfirm, value]);

  const handleSubmit = () => {
    if (value.trim()) onConfirm(value.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-6 shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-150">
        {/* Title */}
        <div className="flex items-center gap-3 mb-4">
          <PenLine className="size-4 text-blue-400 shrink-0" />
          <h3 className="text-[15px] font-black tracking-tight text-white">{title}</h3>
        </div>

        {/* Input */}
        <div className="mb-5">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 block mb-1.5">
            {label}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full bg-[#2d2d2d] border border-[#3d3d3d] focus:border-[#007acc] rounded-lg px-3 py-2 text-[13px] text-gray-200 font-mono outline-none transition-colors placeholder:text-gray-600"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-white/5 rounded-lg text-[12px] font-bold text-gray-300 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="flex-1 px-4 py-2 bg-[#007acc] hover:bg-[#1a8fe0] disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-[12px] font-bold text-white transition-colors"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InputModal;
