/// <reference types="vite/client" />

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
}

interface Window {
  ethereum?: Eip1193Provider;
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_INFURA_PROJECT_ID?: string;
  readonly VITE_ETHERSCAN_API_KEY?: string;
  readonly VITE_DEFAULT_NETWORK?: string;
  readonly VITE_GRAPH_ENDPOINT?: string;
  readonly VITE_GRAPH_REGISTRY_ADDRESS?: string;
  readonly VITE_CRE_TRIGGER_URL?: string;
  readonly VITE_CRE_WORKFLOW_ID?: string;
  readonly VITE_CRE_CONSUMER_ADDRESS?: string;
  readonly VITE_CRE_AUDIT_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
