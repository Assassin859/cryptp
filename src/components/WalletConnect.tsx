import React, { useState, useEffect } from 'react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { BrowserProvider, ethers } from 'ethers';

// Extend window interface for Web3
interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (eventName: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (eventName: string, callback: (...args: unknown[]) => void) => void;
  listAccounts(): Promise<string[]>;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  network: string | null;
  isConnected: boolean;
}

interface WalletError extends Error {
  code?: number;
}

const WalletConnect: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    balance: null,
    network: null,
    isConnected: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);

  // Network names and chain IDs
  const NETWORKS: { [key: number]: string } = {
    1: 'Ethereum Mainnet',
    5: 'Goerli Testnet',
    11155111: 'Sepolia Testnet',
    80001: 'Mumbai Testnet',
    137: 'Polygon'
  };

  const TESTNET_FAUCETS: { [key: number]: string } = {
    5: 'https://goerlifaucet.com/',
    11155111: 'https://faucets.chain.link/sepolia',
    80001: 'https://faucet.polygon.technology/'
  };

  // Check if wallet is already connected on load
  useEffect(() => {
    checkIfConnected();
    if (window.ethereum) {
      const handleChainChange = () => window.location.reload();
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChange);
      return () => {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum!.removeListener('chainChanged', handleChainChange);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length > 0) {
      connectWallet();
    } else {
      disconnectWallet();
    }
  };

  const checkIfConnected = async () => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();
      if (accounts.length > 0) {
        await updateWalletInfo(provider);
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('MetaMask is not installed. Please install it first.');
      window.open('https://metamask.io/', '_blank');
      return;
    }

    setIsLoading(true);
    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      await updateWalletInfo(provider, accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  const updateWalletInfo = async (provider: BrowserProvider, addressOverride?: string) => {
    try {
      const signer = addressOverride 
        ? await provider.getSigner(addressOverride)
        : await provider.getSigner();
      
      const address = await signer.getAddress();
      const network = await provider.getNetwork();
      const balance = await provider.getBalance(address);
      const balanceEth = ethers.formatEther(balance);

      setWallet({
        address,
        chainId: Number(network.chainId),
        balance: parseFloat(balanceEth).toFixed(4),
        network: NETWORKS[Number(network.chainId)] || `Chain ${network.chainId}`,
        isConnected: true
      });
    } catch (error) {
      console.error('Error updating wallet info:', error);
    }
  };

  const disconnectWallet = () => {
    setWallet({
      address: null,
      chainId: null,
      balance: null,
      network: null,
      isConnected: false
    });
  };

  const switchNetwork = async (chainId: number) => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }]
      });
      setShowNetworks(false);
    } catch (error: unknown) {
      const walletError = error as WalletError;
      if (walletError.code === 4902) {
        alert(`Chain ${chainId} is not configured in MetaMask`);
      } else {
        console.error('Error switching network:', error);
      }
    }
  };

  const openFaucet = () => {
    if (wallet.chainId && TESTNET_FAUCETS[wallet.chainId]) {
      window.open(TESTNET_FAUCETS[wallet.chainId], '_blank');
    }
  };

  return (
    <div className="flex items-center gap-3">
      {!wallet.isConnected ? (
        <button
          onClick={connectWallet}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition"
        >
          <Wallet className="h-4 w-4" />
          {isLoading ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-2 border border-gray-700">
          {/* Network Selector */}
          <div className="relative">
            <button
              onClick={() => setShowNetworks(!showNetworks)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded transition"
            >
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              {wallet.network}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showNetworks && (
              <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-lg z-50 min-w-48">
                {Object.entries(NETWORKS).map(([chainId, name]) => (
                  <button
                    key={chainId}
                    onClick={() => switchNetwork(Number(chainId))}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      Number(chainId) === wallet.chainId
                        ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Get Test ETH Button (for testnets) */}
          {wallet.chainId && TESTNET_FAUCETS[wallet.chainId] && (
            <button
              onClick={openFaucet}
              className="text-xs px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition"
              title="Get free testnet ETH"
            >
              Get ETH
            </button>
          )}

          {/* Balance */}
          <div className="text-sm font-medium text-gray-300 px-2">
            {wallet.balance} ETH
          </div>

          {/* Address */}
          <div className="text-sm text-gray-400 px-2 font-mono">
            {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
          </div>

          {/* Disconnect */}
          <button
            onClick={disconnectWallet}
            className="p-1 hover:bg-gray-700 text-gray-400 hover:text-red-400 rounded transition"
            title="Disconnect wallet"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
