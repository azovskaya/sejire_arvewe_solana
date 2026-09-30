import assert from 'node:assert/strict';
import { RpcPaymentPreparer } from './paymentPreparation';
import { SolanaRpcReader, DEVNET_GENESIS } from './rpcReader';
import { fixtureOrder, addr } from './rpcFixtures';
let passed = 0;
for (const mode of ['success', 'missing', 'mint', 'owner', 'program', 'frozen', 'delegate', 'decimals', 'balance', 'sol', 'network', 'blockhash']) {
  const order = fixtureOrder();
  const reader = new SolanaRpcReader({ network: 'devnet' }, async (_url, init) => {
    const p = JSON.parse(init!.body as string); let result: unknown;
    if (p.method === 'getGenesisHash') result = mode === 'network' ? addr(90) : DEVNET_GENESIS;
    else if (p.method === 'getTokenAccountsByOwner') {
      const owner = p.params[0], info = { mint: mode === 'mint' ? addr(90) : order.asset.mint, owner: mode === 'owner' ? addr(90) : owner,
        state: mode === 'frozen' ? 'frozen' : 'initialized', tokenAmount: { amount: mode === 'balance' ? '0' : order.total, decimals: mode === 'decimals' ? 9 : 6 }, ...(mode === 'delegate' ? { delegate: addr(90) } : {}) };
      result = { context: { slot: 100 }, value: mode === 'missing' ? [] : [{ pubkey: addr(11), account: { owner: mode === 'program' ? addr(90) : order.asset.program, executable: false, data: { program: 'spl-token', parsed: { type: 'account', info } } } }] };
    } else if (p.method === 'getLatestBlockhash') result = { value: { blockhash: mode === 'blockhash' ? 'bad' : addr(8), lastValidBlockHeight: 1000 } };
    else if (p.method === 'getBalance') result = { value: mode === 'sol' ? 0 : 1000000 };
    else throw new Error('unexpected_method');
    return Response.json({ jsonrpc: '2.0', id: p.id, result });
  });
  if (mode === 'success') assert.equal((await new RpcPaymentPreparer(reader).prepare(order)).feeLamports, '5000');
  else await assert.rejects(new RpcPaymentPreparer(reader).prepare(order));
  passed++; console.log(`PASS preparation: ${mode}`);
}
console.log(`preparation.selftest: ${passed} synthetic RPC scenarios PASS; no wallet/network`);
