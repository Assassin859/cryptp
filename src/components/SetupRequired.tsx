import React from 'react';
import { Settings, FileCode } from 'lucide-react';

const SetupRequired: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#1e1e1e] text-[#cccccc] p-6">
    <div className="max-w-lg w-full space-y-6 border border-[#333] rounded-lg bg-[#252526] p-8 shadow-xl">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
          <Settings className="size-6 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">CryptP setup required</h1>
          <p className="text-xs text-gray-400">Supabase environment variables are missing</p>
        </div>
      </div>

      <p className="text-sm text-gray-300 leading-relaxed">
        Copy <code className="text-blue-300 bg-black/30 px-1 rounded">.env.example</code> to{' '}
        <code className="text-blue-300 bg-black/30 px-1 rounded">.env.local</code> and add your Supabase
        project URL and anon key from the Supabase dashboard (Settings → API).
      </p>

      <pre className="text-[11px] font-mono bg-[#1a1a1a] border border-[#333] rounded p-4 text-green-400/90 overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
      </pre>

      <p className="text-xs text-gray-500 flex items-start gap-2">
        <FileCode className="size-3.5 shrink-0 mt-0.5" />
        Restart the dev server after saving <code className="text-gray-400">.env.local</code> (
        <code className="text-gray-400">npm run dev</code>).
      </p>

      <a
        href="https://supabase.com/dashboard"
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs text-blue-400 hover:underline"
      >
        Open Supabase Dashboard →
      </a>
    </div>
  </div>
);

export default SetupRequired;
