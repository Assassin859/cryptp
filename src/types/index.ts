// TypeScript type definitions for the application

export interface SimulatedDeployment {
  contractAddress: string;
  transactionHash: string;
  network: string;
  blockNumber: number;
  gasUsed: number;
  deployer: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  isRealChain: boolean;
  abi?: any[];
}

