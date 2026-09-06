import React, { useCallback, useEffect, useState } from 'react';
import { Database, RefreshCw, Link2, AlertCircle, ExternalLink, Settings2 } from 'lucide-react';
import { Contract } from 'ethers';
import { useWeb3 } from '../context/Web3Context';
import {
  abiLooksLikeSimpleStorage,
  getCustomGraphEndpoint,
  getCustomGraphRegistryAddress,
  getGraphEndpoint,
  getGraphRegistryAddress,
  getGraphSourceMode,
  getPlatformGraphEndpoint,
  KIND_SIMPLE_STORAGE,
  REGISTRY_ABI,
  setCustomGraphEndpoint,
  setCustomGraphRegistryAddress,
  setGraphSourceMode,
  type GraphSourceMode,
} from '../utils/graphConstants';
import {
  fetchIndexedContract,
  fetchValueChangedForContract,
  GraphClientError,
  isGraphConfigured,
  isGraphRegisterConfigured,
  type ValueChangedRow,
} from '../utils/graphClient';
import { getErrorMessage } from '../utils/errorMessage';

interface GraphHistoryPanelProps {
  address: string | null;
  network: string | null;
  abi: unknown;
  isRealChain?: boolean;
  /** When true, focus the Register CTA (post-deploy prompt). */
  highlightRegister?: boolean;
  onRegistered?: () => void;
}

const SEPOLIA_HINT = 'Sepolia Testnet';

function isSepoliaNetwork(network: string | null | undefined): boolean {
  if (!network) return false;
  return /sepolia/i.test(network);
}

const GraphHistoryPanel: React.FC<GraphHistoryPanelProps> = ({
  address,
  network,
  abi,
  isRealChain = false,
  highlightRegister = false,
  onRegistered,
}) => {
  const { signer, isConnected, chainId, connect } = useWeb3();
  const [rows, setRows] = useState<ValueChangedRow[]>([]);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const [mode, setMode] = useState<GraphSourceMode>(() => getGraphSourceMode());
  const [showStudioSettings, setShowStudioSettings] = useState(
    () => getGraphSourceMode() === 'studio' || !getPlatformGraphEndpoint()
  );
  const [studioEndpointDraft, setStudioEndpointDraft] = useState(() => getCustomGraphEndpoint());
  const [studioRegistryDraft, setStudioRegistryDraft] = useState(
    () => getCustomGraphRegistryAddress()
  );
  const [configTick, setConfigTick] = useState(0);

  const endpoint = getGraphEndpoint();
  const registryAddress = getGraphRegistryAddress();
  const configured = isGraphConfigured();
  const canRegister = isGraphRegisterConfigured();
  const canIndex =
    Boolean(address) &&
    isRealChain &&
    isSepoliaNetwork(network) &&
    abiLooksLikeSimpleStorage(abi);

  // Force re-read of endpoint/registry after Save Studio / mode toggle
  void configTick;

  useEffect(() => {
    const onPrefs = () => setConfigTick((t) => t + 1);
    window.addEventListener('cryptp-graph-prefs', onPrefs);
    return () => window.removeEventListener('cryptp-graph-prefs', onPrefs);
  }, []);

  const applyMode = (next: GraphSourceMode) => {
    setGraphSourceMode(next);
    setMode(next);
    setConfigTick((t) => t + 1);
    if (next === 'studio') setShowStudioSettings(true);
  };

  const saveStudioSettings = () => {
    setCustomGraphEndpoint(studioEndpointDraft);
    setCustomGraphRegistryAddress(studioRegistryDraft);
    setGraphSourceMode('studio');
    setMode('studio');
    setConfigTick((t) => t + 1);
    setStatus('Using your Graph Studio endpoint.');
    setError(null);
  };

  const refresh = useCallback(async () => {
    if (!address || !endpoint) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const indexed = await fetchIndexedContract(address);
      setRegistered(Boolean(indexed));
      const events = await fetchValueChangedForContract(address);
      setRows(events);
      if (indexed && events.length === 0) {
        setStatus('Indexed — no ValueChanged events yet. Call setValue, then Refresh.');
      }
    } catch (e) {
      if (e instanceof GraphClientError && e.code === 'missing_endpoint') {
        setError(e.message);
      } else {
        setError(getErrorMessage(e) || 'Failed to query The Graph');
      }
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [address, endpoint]);

  useEffect(() => {
    if (canIndex && configured) {
      void refresh();
    } else {
      setRows([]);
      setRegistered(null);
    }
  }, [canIndex, configured, refresh]);

  const handleRegister = async () => {
    if (!address || !registryAddress) {
      setError('Registry address required. Paste it under Use my Graph Studio, or use CryptP platform.');
      setShowStudioSettings(true);
      return;
    }
    if (!isConnected || !signer) {
      await connect();
      return;
    }
    if (chainId !== 11155111) {
      setError('Switch MetaMask to Sepolia to register for indexing.');
      return;
    }

    setRegistering(true);
    setError(null);
    setStatus(null);
    try {
      const registry = new Contract(registryAddress, REGISTRY_ABI, signer);
      const tx = await registry.register(address, KIND_SIMPLE_STORAGE);
      setStatus(`Register tx submitted: ${tx.hash.slice(0, 10)}…`);
      await tx.wait();
      setRegistered(true);
      setStatus('Registered. The Graph will index new ValueChanged events shortly.');
      onRegistered?.();
      setTimeout(() => void refresh(), 4000);
    } catch (e) {
      const msg = getErrorMessage(e) || 'Registration failed';
      if (/AlreadyRegistered|already/i.test(msg)) {
        setRegistered(true);
        setStatus('Already registered on-chain.');
        void refresh();
      } else {
        setError(msg);
      }
    } finally {
      setRegistering(false);
    }
  };

  const studioSettingsBlock = (
    <div className="space-y-2 rounded border border-[#2d2d2d] bg-[#1a1a1c] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Subgraph source</p>
        <button
          type="button"
          onClick={() => setShowStudioSettings((v) => !v)}
          className="text-gray-500 hover:text-gray-300 p-0.5"
          title="Studio settings"
        >
          <Settings2 className="size-3.5" />
        </button>
      </div>
      <div className="flex gap-1 p-0.5 rounded bg-[#121214] border border-[#2d2d2d]">
        <button
          type="button"
          onClick={() => applyMode('platform')}
          className={`flex-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
            mode === 'platform' ? 'bg-[#007acc] text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          CryptP platform
        </button>
        <button
          type="button"
          onClick={() => applyMode('studio')}
          className={`flex-1 px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
            mode === 'studio' ? 'bg-[#007acc] text-white' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          My Graph Studio
        </button>
      </div>

      {(showStudioSettings || mode === 'studio') && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Paste your Studio <strong className="text-gray-400">GraphQL query URL</strong>. Optional
            registry address if you deployed <code className="text-gray-400">CryptPIndexRegistry</code>{' '}
            yourself (needed for Register).
          </p>
          <label className="block space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-600">Query endpoint</span>
            <input
              type="url"
              value={studioEndpointDraft}
              onChange={(e) => setStudioEndpointDraft(e.target.value)}
              placeholder="https://api.studio.thegraph.com/query/..."
              className="w-full bg-[#121214] border border-[#3c3c3c] rounded px-2 py-1.5 text-[11px] text-gray-200 font-mono placeholder:text-gray-700 focus:outline-none focus:border-[#007acc]"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[9px] uppercase tracking-widest text-gray-600">
              Registry address (optional)
            </span>
            <input
              type="text"
              value={studioRegistryDraft}
              onChange={(e) => setStudioRegistryDraft(e.target.value)}
              placeholder="0x…"
              className="w-full bg-[#121214] border border-[#3c3c3c] rounded px-2 py-1.5 text-[11px] text-gray-200 font-mono placeholder:text-gray-700 focus:outline-none focus:border-[#007acc]"
            />
          </label>
          <button
            type="button"
            onClick={saveStudioSettings}
            className="w-full px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#2d2d2d] text-gray-200 hover:bg-[#3c3c3c] border border-[#3c3c3c]"
          >
            Save Studio settings
          </button>
        </div>
      )}
    </div>
  );

  if (!configured && mode === 'platform' && !getCustomGraphEndpoint()) {
    return (
      <div className="p-4 space-y-3 text-xs text-gray-400">
        <div className="flex items-center gap-2 text-amber-400/90">
          <AlertCircle className="size-4 shrink-0" />
          <span className="font-bold uppercase tracking-widest text-[10px]">No subgraph connected</span>
        </div>
        <p>
          CryptP platform endpoint is not set yet. Switch to <strong className="text-gray-300">My Graph Studio</strong>{' '}
          and paste your query URL, or wait for the operator to set{' '}
          <code className="text-gray-300">VITE_GRAPH_ENDPOINT</code>.
        </p>
        {studioSettingsBlock}
        <p className="text-[10px] text-gray-600">See docs/THE_GRAPH.md</p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-[#2d2d2d]">{studioSettingsBlock}</div>
        <div className="p-8 text-center opacity-40 flex-1">
          <Database className="size-8 mx-auto mb-2" />
          <p className="text-xs italic">Select a deployment to view indexed events.</p>
        </div>
      </div>
    );
  }

  if (!isRealChain || !isSepoliaNetwork(network)) {
    return (
      <div className="flex flex-col h-full text-xs">
        <div className="p-4 border-b border-[#2d2d2d]">{studioSettingsBlock}</div>
        <div className="p-4 space-y-3 text-gray-400">
          <p className="font-bold text-gray-300 uppercase tracking-widest text-[10px]">Sandbox / wrong network</p>
          <p>
            The Graph indexes <strong className="text-gray-200">live Sepolia</strong> contracts, not
            the in-browser VM. Deploy or promote to {SEPOLIA_HINT}, then open Indexed.
          </p>
          <p className="text-[10px] text-gray-600 break-all">Current: {network || 'unknown'} · {address}</p>
        </div>
      </div>
    );
  }

  if (!abiLooksLikeSimpleStorage(abi)) {
    return (
      <div className="flex flex-col h-full text-xs">
        <div className="p-4 border-b border-[#2d2d2d]">{studioSettingsBlock}</div>
        <div className="p-4 space-y-2 text-gray-400">
          <p>
            This ABI is not a SimpleStorage <code className="text-gray-300">ValueChanged</code> contract.
            First release indexes SimpleStorage only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full text-xs">
      <div className={`p-4 border-b border-[#2d2d2d] space-y-3 ${highlightRegister ? 'bg-blue-500/5' : ''}`}>
        {studioSettingsBlock}

        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">Contract</p>
          <p className="font-mono text-[11px] text-gray-200 break-all">{address}</p>
          <p className="text-[10px] text-gray-600 mt-1">
            {network}
            {mode === 'studio' ? ' · custom Studio' : ' · CryptP platform'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void handleRegister()}
            disabled={registering || registered === true || !canRegister}
            title={!canRegister ? 'Set a registry address to register' : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${
              registered
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-[#007acc] text-white hover:bg-[#0062a3]'
            } disabled:opacity-50`}
          >
            <Link2 className="size-3.5" />
            {registered ? 'Registered' : registering ? 'Registering…' : 'Register for indexing'}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading || !configured}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#2d2d2d] text-gray-300 hover:text-white border border-[#3c3c3c] disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {status && <p className="text-[10px] text-emerald-400/90">{status}</p>}
        {error && (
          <p className="text-[10px] text-red-400 flex items-start gap-1">
            <AlertCircle className="size-3 mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        {endpoint && (
          <a
            href={endpoint.replace(/\/$/, '')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[9px] text-gray-600 hover:text-gray-400 break-all"
          >
            Subgraph endpoint <ExternalLink className="size-2.5 shrink-0" />
          </a>
        )}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">
          ValueChanged ({rows.length})
        </p>
        {rows.length === 0 ? (
          <p className="text-gray-600 italic text-[11px] p-2">No indexed events yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded border border-[#2d2d2d] bg-[#1e1e1e] p-2.5 space-y-1"
              >
                <div className="flex justify-between gap-2">
                  <span className="text-blue-400 font-mono">value={row.newValue}</span>
                  <span className="text-gray-600">block {row.blockNumber}</span>
                </div>
                <p className="text-gray-500 font-mono text-[10px] truncate">
                  setter {row.setter}
                </p>
                <p className="text-gray-600 font-mono text-[9px] truncate">
                  tx {row.transactionHash}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default GraphHistoryPanel;
