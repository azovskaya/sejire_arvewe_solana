/**
 * Cashier safety: mock must never sit next to a live treasury JWK,
 * and live providers need KV so paid sessions survive worker restarts.
 */
export function cashierGuardError(env: {
  PAYMENT_PROVIDER?: string;
  TURBO_JWK?: string;
  IDEMPOTENCY?: unknown;
}): { status: 503; error: string } | null {
  const provider = (env.PAYMENT_PROVIDER || "mock").toLowerCase();
  const treasury = Boolean(env.TURBO_JWK && env.TURBO_JWK.trim());
  if (provider === "mock" && treasury) {
    return { status: 503, error: "mock_forbidden_with_treasury" };
  }
  if (provider !== "mock" && !env.IDEMPOTENCY) {
    return { status: 503, error: "kv_required" };
  }
  return null;
}
