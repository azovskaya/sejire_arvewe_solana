function toB64(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => {
    s += String.fromCharCode(b);
  });
  return btoa(s);
}

function fromB64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function importAesKey(raw: Uint8Array): Promise<CryptoKey> {
  const copy = new Uint8Array(raw);
  return crypto.subtle.importKey("raw", copy, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export type EnvelopeV1 = {
  schema: "sejire/envelope/v1";
  vault_id: string;
  cipher: "aes-gcm-256";
  kdf: "hkdf-sha256";
  iv: string;
  ciphertext: string;
  protocol: "sejire/v0.3";
};

export async function encryptJson(
  encKey: Uint8Array,
  vaultId: string,
  payload: unknown
): Promise<EnvelopeV1> {
  const key = await importAesKey(encKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(JSON.stringify(payload));
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return {
    schema: "sejire/envelope/v1",
    vault_id: vaultId,
    cipher: "aes-gcm-256",
    kdf: "hkdf-sha256",
    iv: toB64(iv),
    ciphertext: toB64(new Uint8Array(cipherBuf)),
    protocol: "sejire/v0.3",
  };
}

export async function decryptJson<T>(encKey: Uint8Array, envelope: EnvelopeV1): Promise<T> {
  const key = await importAesKey(encKey);
  const iv = fromB64(envelope.iv);
  const data = fromB64(envelope.ciphertext);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  );
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T;
}
