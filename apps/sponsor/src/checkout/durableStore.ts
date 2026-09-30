import type { Order } from '../../../../packages/checkout/order';
import type { ValidatedPayment } from './paymentValidator';
import type { AtomicOrderStore, StoredOrder, CommitResult } from './store';
import { SqliteAtomicOrderStore } from './sqliteStore';

export const LEDGER_OBJECT_NAME = 'sejire-checkout-ledger-v1';
type Env = { CHECKOUT_LEDGER: DurableObjectNamespace };
/** Binding-only service. NOT a public HTTP checkout route. No create/commit forwarding from web.
 * All orders must share the named object; constructor refuses per-order object identities.
 * No production bindings or cloud migration are enabled in this stage.
 */
export class CheckoutLedger {
  private readonly store: SqliteAtomicOrderStore;
  constructor(ctx: DurableObjectState, env: Env) {
    if (!ctx.id.equals(env.CHECKOUT_LEDGER.idFromName(LEDGER_OBJECT_NAME))) throw new Error('wrong_ledger_object');
    this.store = new SqliteAtomicOrderStore(ctx.storage);
  }
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return new Response('method_not_allowed', { status: 405 });
    try {
    const data = await request.json() as { action: string; order: Order; id: string; signature: string; payment: ValidatedPayment };
    // Only trusted Worker service code has this binding. No browser input may invoke create/commit.
    switch (data.action) {
      case 'create': await this.store.create(data.order); return Response.json(null);
      case 'get': return Response.json(await this.store.get(data.id));
      case 'begin': return Response.json(await this.store.beginReconciliation(data.id, data.signature));
      case 'commit': return Response.json(await this.store.commitPayment(data.payment));
      case 'totals': return Response.json(await this.store.totals());
      default: return new Response('unknown_ledger_action', { status: 400 });
    }
    } catch (error) {
      const known = ['order_or_reference_exists', 'order_not_found', 'previous_payment_unresolved', 'order_already_paid',
        'payment_conflict', 'payment_not_reserved', 'credit_allocation_mismatch', 'payment_already_used'];
      const code = error instanceof Error && known.includes(error.message) ? error.message : 'ledger_operation_failed';
      return Response.json({ error: code }, { status: 409 });
    }
  }
}
/** Server adapter fixes the object name globally, never chooses it from order/request input. */
export class DurableOrderStore implements AtomicOrderStore {
  private readonly stub: DurableObjectStub;
  constructor(namespace: DurableObjectNamespace) { this.stub = namespace.get(namespace.idFromName(LEDGER_OBJECT_NAME)); }
  private async call<T>(payload: unknown): Promise<T> {
    const response = await this.stub.fetch('https://checkout-ledger.internal/', { method: 'POST', body: JSON.stringify(payload) });
    if (!response.ok) {
      const error = await response.json() as { error?: string };
      throw new Error(error.error ?? 'ledger_service_unavailable');
    }
    return await response.json() as T;
  }
  async create(order: Order): Promise<void> { await this.call({ action: 'create', order }); }
  get(id: string): Promise<StoredOrder | null> { return this.call({ action: 'get', id }); }
  beginReconciliation(id: string, signature: string): Promise<StoredOrder> { return this.call({ action: 'begin', id, signature }); }
  commitPayment(payment: ValidatedPayment): Promise<CommitResult> { return this.call({ action: 'commit', payment }); }
}
