import { browserVM } from './src/utils/browserVM.js';

async function testDeploy() {
  await browserVM.init();
  const res = await browserVM.deployContract('0x6080604052348015600f57600080fd5b50603f80601d6000396000f3fe6080604052600080fdfea26469706673582212204c3ca0bc311d95c479fb1456a64ebed4bcfe4e17ecce35d1f561dd8af413bf0b64736f6c63430008140033');
  console.log('Deployed!', res);
}

testDeploy().catch(console.error);
