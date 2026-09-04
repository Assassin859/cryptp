import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers';
import { getErrorMessage } from '../utils/errorMessage';

interface Web3ContextType {
  account: string | null;
  chainId: number | null;
  balance: string | null;
  networkName: string | null;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

const SUPPORTED_NETWORKS: Record<number, string> = {
  1: 'Ethereum Mainnet',
  11155111: 'Sepolia Testnet',
  137: 'Polygon',
  80002: 'Polygon Amoy Testnet',
  42161: 'Arbitrum One',
  10: 'Optimism',
  56: 'BNB Smart Chain',
  8453: 'Base Mainnet'
};

const CHAIN_ADD_PARAMS: Record<number, {
  chainId: string;
  chainName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
}> = {
  11155111: {
    chainId: '0xaa36a7',
    chainName: 'Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
  80002: {
    chainId: '0x13882',
    chainName: 'Polygon Amoy',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://rpc-amoy.polygon.technology'],
    blockExplorerUrls: ['https://amoy.polygonscan.com'],
  },
  8453: {
    chainId: '0x2105',
    chainName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.base.org'],
    blockExplorerUrls: ['https://basescan.org'],
  },
};

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWalletState = useCallback(async (browserProvider: BrowserProvider) => {
    try {
      const network = await browserProvider.getNetwork();
      const currentSigner = await browserProvider.getSigner();
      const address = await currentSigner.getAddress();
      const currentBalance = await browserProvider.getBalance(address);

      setAccount(address);
      setChainId(Number(network.chainId));
      setBalance(parseFloat(formatEther(currentBalance)).toFixed(4));
      setProvider(browserProvider);
      setSigner(currentSigner);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to update wallet state:', err);
      setError(getErrorMessage(err) || 'Failed to update wallet state');
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    setIsConnecting(true);
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      await updateWalletState(browserProvider);
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setChainId(null);
    setBalance(null);
    setProvider(null);
    setSigner(null);
  };

  const switchNetwork = async (targetChainId: number) => {
    if (!window.ethereum) return;
    const chainIdHex = `0x${targetChainId.toString(16)}`;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }]
      });
    } catch (err: unknown) {
      const e = err as { code?: number; message?: string };
      if (e.code === 4902) {
        const addParams = CHAIN_ADD_PARAMS[targetChainId];
        if (addParams) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [addParams],
            });
            return;
          } catch (addErr: unknown) {
            setError(getErrorMessage(addErr) || `Failed to add chain ${targetChainId}`);
            return;
          }
        }
        setError(`Chain ${targetChainId} not found in MetaMask`);
      } else {
        setError(e.message || 'Network switch failed');
      }
    }
  };

  useEffect(() => {
    if (!window.ethereum) return;

    const browserProvider = new BrowserProvider(window.ethereum);

    browserProvider.listAccounts().then(accounts => {
      if (accounts.length > 0) {
        updateWalletState(browserProvider);
      }
    });

    const handleAccountsChanged = (accounts: unknown) => {
      const list = accounts as string[];
      if (list.length > 0) {
        // Always rebuild provider — MetaMask can invalidate the old one.
        const next = new BrowserProvider(window.ethereum!);
        updateWalletState(next);
      } else {
        disconnect();
      }
    };

    // Soft-refresh wallet state only. Full reload wiped in-memory IDE work
    // (compile results, active deployment panel, unsaved editor context).
    const handleChainChanged = () => {
      const next = new BrowserProvider(window.ethereum!);
      void updateWalletState(next);
    };

    window.ethereum.on?.('accountsChanged', handleAccountsChanged);
    window.ethereum.on?.('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [updateWalletState]);

  const networkName = chainId ? SUPPORTED_NETWORKS[chainId] || `Chain ${chainId}` : null;

  return (
    <Web3Context.Provider value={{
      account,
      chainId,
      balance,
      networkName,
      provider,
      signer,
      isConnected: !!account,
      isConnecting,
      error,
      connect,
      disconnect,
      switchNetwork
    }}>
      {children}
    </Web3Context.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
