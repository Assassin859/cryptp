import { VM } from '@ethereumjs/vm';
import { Common } from '@ethereumjs/common';

async function test() {
    const common = new Common({ chain: 'mainnet', hardfork: 'shanghai' });
    const vm = await VM.create({ common });
    console.log("EthereumJS VM initialized successfully:", !!vm);
}

test().catch(console.error);
