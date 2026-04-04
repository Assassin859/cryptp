import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BrowserProvider, JsonRpcSigner, formatEther } from 'ethers';

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
  80001: 'Mumbai Testnet',
  42161: 'Arbitrum One',
  10: 'Optimism',
  56: 'BNB Smart Chain',
  8453: 'Base Mainnet'
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
    } catch (err: any) {
      console.error('Failed to update wallet state:', err);
      setError(err.message || 'Failed to update wallet state');
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
    } catch (err: any) {
      setError(err.message || 'Connection failed');
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
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }]
      });
    } catch (err: any) {
      if (err.code === 4902) {
        setError(`Chain ${targetChainId} not found in MetaMask`);
      } else {
        setError(err.message || 'Network switch failed');
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      const browserProvider = new BrowserProvider(window.ethereum);
      
      // Auto-connect if already authorized
      browserProvider.listAccounts().then(accounts => {
        if (accounts.length > 0) {
          updateWalletState(browserProvider);
        }
      });

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          updateWalletState(browserProvider);
        } else {
          disconnect();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged as any);
      window.ethereum.on('chainChanged', handleChainChanged as any);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged as any);
        window.ethereum?.removeListener('chainChanged', handleChainChanged as any);
      };
    }
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

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};
