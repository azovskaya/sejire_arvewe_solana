# Access by 12 words (BIP-39)

**Goal:** Anyone who knows the 12-word phrase can open their SEJIRE vault from any device, anywhere. No email, no SEJIRE account.

## Derivation

```
mnemonic (12 words, BIP-39 English)
    │
    ▼
seed = PBKDF2(mnemonic)          // bip39 mnemonicToSeed
    │
    ▼
master = HKDF-SHA256(seed, info="sejire/v1")
    ├── encKey   = HKDF(master, info="enc")     // AES-256-GCM
    ├── vaultId  = SHA256(master || "vault")[0:16 hex]  // public locator
    └── arweave JWK = RSA-2048 via deterministic PRNG(seed)  // ownership / publish
```

Same 12 words ⇒ same `vaultId`, same encryption key, same Arweave address.

## Vault envelope (what is stored forever)

Published to Arweave (and cached locally encrypted):

```json
{
  "schema": "sejire/envelope/v1",
  "vault_id": "…",
  "cipher": "aes-gcm-256",
  "kdf": "hkdf-sha256",
  "iv": "<base64>",
  "ciphertext": "<base64>"
}
```

Plaintext vault (never uploaded raw):

```json
{
  "schema": "sejire/vault/v1",
  "vault_id": "…",
  "trees": { "<tree_id>": /* TreeStore */ },
  "active_tree_id": "…"
}
```

Arweave tags:

| Tag | Value |
|-----|-------|
| `App-Name` | `SEJIRE` |
| `Protocol` | `sejire/v0.3` |
| `Type` | `vault-envelope` |
| `Vault-Id` | `vaultId` |
| `Updated-At` | ISO timestamp of this save |
| `Parent-Tx` | previous vault TX under the same `Vault-Id` (optional chain) |

## Recovery algorithm

1. User opens app and builds tree **without** seed (local draft + guide)
2. On **Publish to Arweave**, user creates/enters 12 words
3. Client derives `encKey` + `vaultId` (+ wallet)
4. Encrypt vault envelope and publish with tag `Vault-Id` (+ `Updated-At`, optional `Parent-Tx`)
5. Later / other device: enter 12 words → GraphQL lists **all** versions by vaultId → user picks one → decrypt
6. Edit + publish again with the **same** 12 words → new TX (new payment); old versions remain

**Restore does not need** SEJIRE payment cashier, Kaspi, Stripe, or any project backend — only the SPA + Arweave gateways. Locked for the team: `docs/LOCKED_DECISIONS.ru.md` §4.

Draft trees live in `localStorage` unencrypted until publish.

## Security notes

- Seed NEVER leaves the device / never sent to SEJIRE servers (there are none required)
- Show seed once at creation; require re-entry confirmation
- Public `vaultId` does not reveal family data
- Losing the 12 words = losing write access and decryption (warn clearly)

See also: `docs/security/KEY_MANAGEMENT.ru.md`, `docs/flows/07-seed-access.md`
