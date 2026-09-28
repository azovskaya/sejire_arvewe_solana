import assert from 'node:assert/strict';
import { connectWallet } from './client';

let address = 'wallet-A';
let messages = 0;
const provider = {
  publicKey: { toString: () => address },
  connect: async () => {},
  signMessage: async (message: Uint8Array) => { messages++; return message; },
  signTransaction: async (tx: unknown) => tx,
};
Object.defineProperty(globalThis, 'window', { configurable: true, value: { phantom: { solana: provider } } });
const adapter = await connectWallet('Phantom');
assert.notEqual(adapter, provider);
assert.equal(adapter.publicKey.toString(), 'wallet-A');
await adapter.signMessage(new Uint8Array([1]));
assert.equal(messages, 1);
address = 'wallet-B';
assert.throws(() => adapter.publicKey.toString(), /wallet_changed/);
await assert.rejects(() => adapter.signMessage(new Uint8Array([2])), /wallet_changed/);
assert.equal(messages, 1, 'must refuse to request a signature from a different account');
await assert.rejects(() => connectWallet('Solflare'), /wallet_not_found/);
console.log('solana.wallet.selftest: OK — adapter isolation, changed account and unavailable wallet');
