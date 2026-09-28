# Sponsor edge (Cloudflare Worker) — SEJIRE cashier

Thin **payment verify → Turbo upload** for sealed vault envelopes.
Never handles BIP-39 / plaintext trees.

Locked rail for KZ: **Kaspi Pay Business** (ИП/ТОО). Until merchant exists, `PAYMENT_PROVIDER=mock`.

See `docs/LOCKED_DECISIONS.ru.md`, ADR-0006, `docs/flows/10-fiat-publish.md`.

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/health` | Liveness + price + `kaspiReady` / `treasuryReady` |
| POST | `/v1/checkout` | Create payment session (Kaspi `payUrl` when live) |
| POST | `/v1/mock-pay` | Mark session paid (**mock only**) |
| GET | `/v1/session` | Poll payment (`paid` after Kaspi / mock) |
| POST | `/v1/kaspi-webhook` | Kaspi HMAC callback |
| POST | `/v1/publish` | `{ sessionId, envelope }` → verify → Turbo upload → `{ txId }` |
| GET | `/admin` | Ops desk: counts, times, keys form (no user data) |
| GET | `/v1/admin/status` | `{ needsSetup, pinRequired, kvBound }` |
| POST | `/v1/admin/setup` | First-time admin password (`{ password, pin? }`) |
| GET | `/v1/admin/overview` | Counts JSON (`Authorization: Bearer` password) |
| GET / PUT | `/v1/admin/keys` | Redacted settings / save secrets (empty field = leave unchanged) |
| POST | `/v1/admin/treasury/generate` | Create treasury JWK on the Worker; JSON returned **once** |
| POST | `/v1/admin/password` | Change admin password |

## Local mock

```bash
cd apps/sponsor
npm install
npm test
# optional live worker:
# npx wrangler dev
```

Web app (sponsor path):

```bash
# apps/web/.env.local
VITE_PUBLISH_MODE=sponsor
VITE_SPONSOR_URL=http://127.0.0.1:8787
```

## Going live (Kaspi)

Protocol is wired (Merchant API v2: HMAC invoice, poll, webhook). Remaining is cabinet + secrets:

1. `npx wrangler kv namespace create IDEMPOTENCY` → uncomment in `wrangler.toml`  
2. `npx wrangler deploy`  
3. Открыть `https://<worker>/admin` — пароль, казна, Kaspi, цена (см. `docs/TREASURY_AND_ADMIN.ru.md`)  
4. ИП/ТОО + Kaspi Pay Business, когда будет мерчант  
5. Optional `[vars]`: `SETUP_PIN`, `APP_ORIGIN` (Pages + `https://sejire.ar.io`)  
6. In Kaspi cabinet, webhook = `https://<worker>/v1/kaspi-webhook`

Запасной путь без админки: на Mac `npm run treasury:init`, затем вставить `jwk` во вкладку «Ключи».

## Security

- Reject bodies with `mnemonic` / `seed` / `trees` / …
- Only `sejire/envelope/v1` ciphertext
- One paid session → one upload (idempotent)
- Restore-by-12-words never needs this Worker
