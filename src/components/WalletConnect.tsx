import React, { useState } from 'react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';
import { useWeb3 } from '../context/Web3Context';

const WalletConnect: React.FC = () => {
  const { account, networkName, balance, isConnected, isConnecting, connect, disconnect, switchNetwork, chainId } = useWeb3();
  const [showNetworks, setShowNetworks] = useState(false);

  // Network names and chain IDs
  const NETWORKS: { [key: number]: string } = {
    1: 'Ethereum Mainnet',
    11155111: 'Sepolia Testnet',
    8453: 'Base Mainnet',
    137: 'Polygon',
    42161: 'Arbitrum One'
  };

  const TESTNET_FAUCETS: { [key: number]: string } = {
    11155111: 'https://faucets.chain.link/sepolia',
    80001: 'https://faucet.polygon.technology/'
  };

  const handleSwitchNetwork = async (targetChainId: number) => {
    await switchNetwork(targetChainId);
    setShowNetworks(false);
  };

  const openFaucet = () => {
    if (chainId && TESTNET_FAUCETS[chainId]) {
      window.open(TESTNET_FAUCETS[chainId], '_blank');
    }
  };

  return (
    <div className="flex items-center gap-3">
      {!isConnected ? (
        <button
          onClick={connect}
          disabled={isConnecting}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium text-sm transition"
        >
          <Wallet className="h-4 w-4" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1.5 border border-gray-700">
          {/* Network Selector */}
          <div className="relative z-50">
            <button
              onClick={() => setShowNetworks(!showNetworks)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs text-gray-300 rounded transition"
            >
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              {networkName || 'Unknown Network'}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showNetworks && (
              <div className="absolute top-full mt-1 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl min-w-[200px] overflow-hidden">
                {Object.entries(NETWORKS).map(([id, name]) => (
                  <button
                    key={id}
                    onClick={() => handleSwitchNetwork(Number(id))}
                    className={`w-full text-left px-4 py-2 text-sm transition ${
                      Number(id) === chainId
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

          {/* Testnet Faucet */}
          {chainId && TESTNET_FAUCETS[chainId] && (
            <button
              onClick={openFaucet}
              className="text-[10px] px-2 py-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition font-bold"
              title="Get free testnet tokens"
            >
              FAUCET
            </button>
          )}

          {/* Balance */}
          <div className="text-xs font-medium text-gray-300 px-2 shrink-0">
            {balance} ETH
          </div>

          {/* Address */}
          <div className="text-xs text-gray-400 px-2 font-mono shrink-0 border-l border-gray-600 pl-3">
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </div>

          {/* Disconnect */}
          <button
            onClick={disconnect}
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
