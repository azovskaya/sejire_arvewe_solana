export type RpcFailure = 'rpc-timeout' | 'rpc-rate-limited' | 'rpc-server-error' | 'rpc-unavailable' |
  'rpc-malformed' | 'rpc-response-too-large' | 'wrong-network' | 'signature-mismatch' |
  'missing-metadata' | 'unsupported-transaction' | 'transaction-failed' | 'not-finalized';
export class RpcEvidenceError extends Error {
  readonly reason: RpcFailure;
  constructor(reason: RpcFailure) { super(reason); this.reason = reason; this.name = 'RpcEvidenceError'; }
}
