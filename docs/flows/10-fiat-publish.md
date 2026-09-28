# Flow 10 — Fiat publish (Kaspi) → sponsored Arweave

Related ADR: [0006-sponsored-fiat-publish.md](../adr/0006-sponsored-fiat-publish.md)  
Locked rail: [LOCKED_DECISIONS.ru.md](../LOCKED_DECISIONS.ru.md) §3 — **Kaspi**, не Stripe.

## Happy path

1. User builds a tree (local draft).
2. Clicks **Сохранить** → 12 words (device only) → vault sealed.
3. Chooses **Навсегда · оплата** (when `VITE_PUBLISH_MODE=sponsor`).
4. Client `POST /v1/checkout` → `sessionId` (+ Kaspi `payUrl` when live).
5. User pays via **Kaspi Pay Business** (or mock-pay in dev).
6. Client `POST /v1/publish` with `{ sessionId, envelope }` only — **no seed**.
7. Edge verifies paid, uploads via Turbo (treasury), returns `txId`.
8. UI shows success; restore still works from 12 words alone.

## Flags

| Env | Meaning |
|-----|---------|
| `VITE_PUBLISH_MODE=self` | Default: user funds derived AR address |
| `VITE_PUBLISH_MODE=sponsor` | Cashier path |
| `VITE_SPONSOR_URL` | Worker origin |

Self-fund remains available as fallback button in the modal.

## Failure path

| Failure | Handling |
|---------|----------|
| Payment declined / not paid | No upload |
| Payment ok, upload fails | Edge retries; then refund (live) |
| Envelope too large | Reject (`413`) |
| Replay same session | Idempotent: return existing `txId` |
| Body contains mnemonic/trees | Reject (`forbidden_field`) |

## Security

- Seed / mnemonic: never in request body.
- Envelope: ciphertext only (`sejire/envelope/v1`).
- Edge auth: paid Kaspi/mock session check.
- Size limit: 512 KiB MVP.
- Restore: no cashier required.
