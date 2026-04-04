import React, { useState } from 'react';
import { SimulatedDeployment } from '../types';
import { Clock11, MapPin, CheckCircle, Link, Hash, User, Zap, Trash2, Activity } from 'lucide-react';

interface SimulatedChainProps {
  deployments: SimulatedDeployment[];
  onReset?: () => void;
  onInteract?: (deployment: SimulatedDeployment) => void;
  onPromote?: (deployment: SimulatedDeployment) => void;
}

const SimulatedChain: React.FC<SimulatedChainProps> = ({ deployments, onReset, onInteract, onPromote }) => {
  const [nodeStatus, setNodeStatus] = useState<'online' | 'offline' | 'checking'>('checking');
  
  // Check node status on mount and periodic refresh
  React.useEffect(() => {
    const checkNode = async () => {
      try {
        const { browserVM } = await import('../utils/browserVM');
        await browserVM.init();
        // We'll peek at the internal state if we can, or just trust the init didn't throw a hard rejection
        // Since we modified browserVM to be resilient, we need a way to know if it's in mock mode.
        // For now, let's just do a simple check.
        setNodeStatus((browserVM as any).isNodeOffline ? 'offline' : 'online');
      } catch (e) {
        setNodeStatus('offline');
      }
    };
    
    checkNode();
    const interval = setInterval(checkNode, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, []);

  console.log('SimulatedChain render:', { deploymentsCount: deployments.length, deployments, nodeStatus });
  const [hoveredBlock, setHoveredBlock] = useState<number | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<number | null>(null);
  const [tooltipCoords, setTooltipCoords] = useState<{ top: number; left: number } | null>(null);

  const updateTooltipPosition = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    const left = Math.min(window.innerWidth - 350, rect.right + 12);
    const top = Math.max(12, rect.top);
    setTooltipCoords({ left, top });
  };

  const handleMouseEnter = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    setHoveredBlock(index);
    setSelectedBlock(null);
    updateTooltipPosition(e.currentTarget);
  };

  const handleMouseLeave = () => {
    setHoveredBlock(null);
    if (selectedBlock === null) {
      setTooltipCoords(null);
    }
  };

  const handleClick = (index: number, e: React.MouseEvent<HTMLDivElement>) => {
    const isSame = selectedBlock === index;
    const nextSelected = isSame ? null : index;
    setSelectedBlock(nextSelected);
    setHoveredBlock(nextSelected);

    if (nextSelected !== null) {
      updateTooltipPosition(e.currentTarget);
    } else {
      setTooltipCoords(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link className="h-4 w-4 text-blue-300" />
          <h3 className="text-sm font-semibold text-white">Blockchain Visualization</h3>
          
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-gray-900 rounded-full border border-gray-700">
             <div className={`h-1.5 w-1.5 rounded-full ${
               nodeStatus === 'online' ? 'bg-green-500 animate-pulse' : 
               nodeStatus === 'offline' ? 'bg-orange-500' : 'bg-gray-500'
             }`}></div>
             <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
               {nodeStatus === 'online' ? 'Live Node' : nodeStatus === 'offline' ? 'Internal Simulation' : 'Checking...'}
             </span>
          </div>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-all flex items-center gap-1.5 text-xs font-medium"
            title="Reset Simulated Chain"
          >
            <Trash2 className="h-4 w-4" />
            <span>Reset Chain</span>
          </button>
        )}
      </div>

      <div className="p-4 text-xs text-gray-300">
        <p className="mb-2 text-gray-400">Visual blockchain representation of deployed contracts.</p>
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700 mb-4">
          <div className="flex items-center gap-1 text-green-300 text-xs">
            <CheckCircle className="h-3 w-3" />
            <span>Each block represents a deployed contract.</span>
          </div>
          <div className="flex items-center gap-1 mt-1 text-gray-400 text-xs">
            <MapPin className="h-3 w-3" />
            <span>Hover over blocks for deployment details.</span>
          </div>
        </div>

        {deployments.length === 0 ? (
          <div className="p-8 bg-gray-900 rounded border border-gray-700 text-center text-gray-500">
            <div className="text-4xl mb-2">🔗</div>
            <div>No deployed contracts yet.</div>
            <div className="text-xs mt-1">Compile and deploy to start building your blockchain!</div>
          </div>
        ) : (
          <div className="relative">
            {/* Blockchain visualization */}
            <div className="flex items-center gap-4 overflow-x-auto pb-4">
              {deployments.map((deployment, index) => (
                <React.Fragment key={`${deployment.contractAddress}-${index}`}>
                  {/* Connection line (except for first block) */}
                  {index > 0 && (
                    <div className="flex-shrink-0 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                      <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full border-2 border-gray-800"></div>
                    </div>
                  )}

                  {/* Block */}
                  <div
                    className="relative flex-shrink-0 group cursor-pointer"
                    onMouseEnter={(e) => handleMouseEnter(index, e)}
                    onMouseLeave={handleMouseLeave}
                    onClick={(e) => handleClick(index, e)}
                  >
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg border-2 border-gray-600 shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl">
                      {/* Block header */}
                      <div className="h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-t-md flex items-center justify-center">
                        <Hash className="h-3 w-3 text-white" />
                      </div>

                      {/* Block content */}
                      <div className="p-2 text-center">
                        <div className="text-xs font-bold text-white mb-1">
                          #{index + 1}
                        </div>
                        <div className="text-xs text-blue-100 truncate">
                          {deployment.contractAddress.slice(0, 6)}...
                        </div>
                      </div>

                      {/* Block footer */}
                      <div className="h-4 bg-gray-700 rounded-b-md flex items-center justify-center">
                        <Zap className="h-2 w-2 text-yellow-400" />
                      </div>
                    </div>

                    {/* Hover/Click tooltip */}
                    {(hoveredBlock === index || selectedBlock === index) && tooltipCoords && (
                      <div
                        className="fixed z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto"
                        style={{ top: tooltipCoords.top, left: tooltipCoords.left }}
                      >
                        <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                          <Hash className="h-4 w-4 text-blue-400" />
                          Block #{index + 1}
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-300">{deployment.network}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-gray-300 font-mono text-xs">
                              {deployment.deployer.slice(0, 6)}...{deployment.deployer.slice(-4)}
                            </span>
                          </div>

                          <div className="bg-gray-900 rounded p-2">
                            <div className="text-gray-400 mb-1">Contract Address:</div>
                            <div className="font-mono text-blue-300 text-xs break-all">
                              {deployment.contractAddress}
                            </div>
                          </div>

                          <div className="bg-gray-900 rounded p-2">
                            <div className="text-gray-400 mb-1">Transaction Hash:</div>
                            <div className="font-mono text-purple-300 text-xs break-all">
                              {deployment.transactionHash}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-gray-900 rounded p-2">
                              <div className="text-gray-400 text-xs">Block</div>
                              <div className="font-mono text-green-300 text-xs">
                                {deployment.blockNumber}
                              </div>
                            </div>
                            <div className="bg-gray-900 rounded p-2">
                              <div className="text-gray-400 text-xs">Gas Used</div>
                              <div className="font-mono text-yellow-300 text-xs">
                                {deployment.gasUsed.toLocaleString()}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-gray-400">
                            <Clock11 className="h-3 w-3" />
                            <span className="text-xs">
                              {new Date(deployment.timestamp).toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <CheckCircle className={`h-3 w-3 ${deployment.status === 'confirmed' ? 'text-green-400' : 'text-yellow-400'}`} />
                            <span className={`text-xs ${deployment.status === 'confirmed' ? 'text-green-300' : 'text-yellow-300'}`}>
                              {deployment.status}
                            </span>
                          </div>

                          <div className="flex flex-col gap-2 mt-2">
                            {onInteract && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInteract(deployment);
                                }}
                                className="flex items-center justify-center gap-2 w-full py-1.5 bg-green-600/20 text-green-300 border border-green-500/40 rounded hover:bg-green-600/30 transition-all text-[10px] font-bold uppercase tracking-wider"
                              >
                                <Activity className="h-3 w-3" />
                                Interact with Contract
                              </button>
                            )}

                            {onPromote && !deployment.isRealChain && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onPromote(deployment);
                                }}
                                className="flex items-center justify-center gap-2 w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/50 rounded transition-all text-[10px] font-bold uppercase tracking-wider relative overflow-hidden group"
                              >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1s_infinite]"></div>
                                <Zap className="h-3 w-3" />
                                Promote via MetaMask
                              </button>
                            )}
                            {deployment.isRealChain && (
                              <div className="flex items-center justify-center gap-2 w-full py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded text-[10px] font-bold uppercase tracking-wider">
                                <MapPin className="h-3 w-3" />
                                Live on {deployment.network}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Arrow removed - now positioned to the right */}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Genesis block indicator */}
            {deployments.length > 0 && (
              <div className="mt-4 p-3 bg-gray-900 rounded border border-gray-700">
                <div className="flex items-center gap-2 text-green-300 text-xs">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span>Genesis Block: First contract deployment on {deployments[0].network}</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Chain contains {deployments.length} block{deployments.length !== 1 ? 's' : ''} •
                  Latest: {new Date(deployments[deployments.length - 1].timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulatedChain;
