import { assertBase58, TOKEN_PROGRAM, type Order } from '../../../../packages/checkout/order';
import { assertUnits } from '../../../../packages/checkout/amounts';
import { SolanaRpcReader, DEVNET_GENESIS } from './rpcReader';
import { object } from './rpcDecoder';
export type PaymentPreparation = {
  source: string; serviceDestination?: string; fundDestination?: string;
  blockhash: string; lastValidBlockHeight: number; feeLamports: string;
};
export interface PaymentPreparer { prepare(order: Order): Promise<PaymentPreparation> }
/** Existing classic SPL accounts only. No ATA creation, no delegate, no extra instructions. */
export class RpcPaymentPreparer implements PaymentPreparer {
  constructor(private readonly reader = new SolanaRpcReader({ network: 'devnet' })) {}
  async prepare(order: Order): Promise<PaymentPreparation> {
    if (order.network !== 'devnet' || order.asset.symbol !== 'USDC' || await this.reader.rpc('getGenesisHash') !== DEVNET_GENESIS) throw new Error('payment_network_not_ready');
    const account = async (owner: string, amount: string) => {
      const payload = object(await this.reader.rpc('getTokenAccountsByOwner', [owner, { mint: order.asset.mint }, { encoding: 'jsonParsed', commitment: 'finalized' }]));
      if (!Array.isArray(payload.value) || payload.value.length > 100) throw new Error('token_accounts_not_ready');
      for (const raw of payload.value) {
        const entry = object(raw), a = object(entry.account), data = object(a.data), parsed = object(data.parsed), info = object(parsed.info), balance = object(info.tokenAmount);
        if (a.owner !== TOKEN_PROGRAM || a.executable !== false || data.program !== 'spl-token' || parsed.type !== 'account' || info.state !== 'initialized' || info.owner !== owner || info.mint !== order.asset.mint || balance.decimals !== 6 || info.delegate !== undefined) continue;
        if (assertUnits(balance.amount as string) < BigInt(amount)) continue;
        assertBase58(entry.pubkey as string, 32); return entry.pubkey as string;
      }
      throw new Error('token_accounts_not_ready');
    };
    const source = await account(order.payer, order.total);
    const serviceDestination = order.servicePayment.amount !== '0' ? await account(order.servicePayment.recipient, '0') : undefined;
    const fundDestination = order.fundContribution.amount !== '0' ? await account(order.fundContribution.recipient, '0') : undefined;
    const latest = object(await this.reader.rpc('getLatestBlockhash', [{ commitment: 'finalized' }])), value = object(latest.value);
    assertBase58(value.blockhash as string, 32);
    if (!Number.isSafeInteger(value.lastValidBlockHeight)) throw new Error('invalid_block_height');
    // Template has exactly one signer and no priority-fee instructions. Base fee is checked again
    // using getFeeForMessage by the browser, before displaying the exact wallet confirmation.
    const balance = object(await this.reader.rpc('getBalance', [order.payer, { commitment: 'finalized' }]));
    if (!Number.isSafeInteger(balance.value) || (balance.value as number) < 5000) throw new Error('network_fee_balance_not_ready');
    return { source, ...(serviceDestination ? { serviceDestination } : {}), ...(fundDestination ? { fundDestination } : {}), blockhash: value.blockhash as string, lastValidBlockHeight: value.lastValidBlockHeight as number, feeLamports: '5000' };
  }
}
