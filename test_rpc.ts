import { browserVM } from './src/utils/browserVM.js';

async function testRpc() {
  console.log('Testing RPC Integration...');
  
  // Deploying the simple hardcoded Bytecode (Returns 42)
  const bytecode = '0x6080604052348015600f57600080fd5b50602a60005260206000f3';
  const res = await browserVM.deployContract(bytecode);
  
  console.log('Transaction Result:', res);
  
  // Test runCall (Mock constant read to the deployed address)
  const callRes = await browserVM.runCall(res.contractAddress, '0x00');
  console.log('Call Result (Should be 0x...002a = 42):', callRes.returnValue);
}

testRpc().catch(console.error);
