import { loadOpsSecrets, type StoredOpsSecrets } from "./opsSecrets";

export type AdminAuthResult = "off" | "unauthorized" | "ok";

const PBKDF2_ITERS = 210_000;
const MIN_PASSWORD = 12;
const MIN_ENV_TOKEN = 16;

function encoder() {
  return new TextEncoder();
}

function toB64(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = "";
  for (const b of arr) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

export function passwordTooShort(password: string): boolean {
  return password.trim().length < MIN_PASSWORD;
}

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITERS },
    key,
    256,
  );
  return `pbkdf2$${PBKDF2_ITERS}$${toB64(salt)}$${toB64(bits)}`;
}

export async function verifyAdminPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;
  const salt = fromB64(parts[2]);
  const expected = fromB64(parts[3]);
  const key = await crypto.subtle.importKey("raw", encoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    expected.length * 8,
  );
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i += 1) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

function bearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function envTokenOk(env: { ADMIN_TOKEN?: string }, token: string): boolean {
  const expected = env.ADMIN_TOKEN?.trim() || "";
  return expected.length >= MIN_ENV_TOKEN && token.length > 0 && token === expected;
}

export function adminNeedsSetup(env: { ADMIN_TOKEN?: string }, secrets: StoredOpsSecrets): boolean {
  if (secrets.passwordHash) return false;
  if ((env.ADMIN_TOKEN || "").trim().length >= MIN_ENV_TOKEN) return false;
  return true;
}

export async function authorizeAdmin(
  request: Request,
  env: { ADMIN_TOKEN?: string; IDEMPOTENCY?: KVNamespace },
  secrets?: StoredOpsSecrets,
): Promise<AdminAuthResult> {
  const stored = secrets ?? (await loadOpsSecrets(env));
  const token = bearerToken(request);
  if (!token) {
    return adminNeedsSetup(env, stored) ? "off" : "unauthorized";
  }
  if (stored.passwordHash) {
    return (await verifyAdminPassword(token, stored.passwordHash)) ? "ok" : "unauthorized";
  }
  if (envTokenOk(env, token)) return "ok";
  return adminNeedsSetup(env, stored) ? "off" : "unauthorized";
}

export function setupPinRequired(env: { SETUP_PIN?: string }): boolean {
  return Boolean((env.SETUP_PIN || "").trim());
}

export function setupPinMatches(env: { SETUP_PIN?: string }, pin: string): boolean {
  const expected = (env.SETUP_PIN || "").trim();
  if (!expected) return true;
  return pin.trim() === expected;
}
