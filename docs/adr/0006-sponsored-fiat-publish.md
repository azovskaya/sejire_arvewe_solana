# ADR-0006 — Fiat-sponsored Arweave publish + permaweb UI

- **Status:** Accepted for Phase 3.5
- **Date:** 2026-07-27 · **Payment rail updated:** 2026-08-07
- **Supersedes (partially):** ADR-0001 “no app backend” — a **thin sponsor edge** is allowed; it never receives the BIP-39 seed.
- **Payment rail (locked):** **Kaspi Pay Business (₸)** for Kazakhstan — not Stripe. See `LOCKED_DECISIONS.ru.md` §3. Until ИП/ТОО + merchant API exist, Worker runs `PAYMENT_PROVIDER=mock`.

## Context

Users must not buy AR tokens. Product goal: click **Навсегда** → pay ~$3 / local ₸ → encrypted vault is permanently stored. The SPA itself should also live on the permaweb (not only GitHub Pages).

## Decision

### A. Site hosting (decentralized)

1. Keep GitHub Pages as a **mirror / bootstrap** during transition.
2. Deploy `apps/web/dist` to Arweave via **Turbo + permaweb-deploy**.
3. Point **ArNS** `sejire` at the latest manifest TX → `https://sejire.ar.io`.
4. Fund site redeploys from the **project Turbo wallet** (treasury), not from end users.

### B. Vault publish (user pays fiat, we sponsor storage)

**Invariant:** 12 words never leave the device (see `SEED_ACCESS.md`).

**MVP flow:**

```
Client                         Kaspi               Sponsor edge              Turbo / Arweave
  |                              |                      |                         |
  | seal vault locally           |                      |                         |
  | create checkout  ---------------------------------->|                         |
  | <---- sessionId (+ payUrl) -------------------------|                         |
  | pay ₸  --------------------->|                      |                         |
  | POST envelope + sessionId ------------------------->|                         |
  |                              |   verify paid ------>|                         |
  |                              |                      | upload envelope ------->|
  |                              |                      |<------ txId ------------|
  |<----------------------------- txId -----------------|                         |
```

- Client encrypts with keys from the seed (**seed stays local**).
- Sponsor edge verifies the payment session is paid **exactly once**.
- Edge uploads the sealed envelope with the **project Turbo wallet**.
- Tags stay the same (`App-Name`, `Vault-Id`, …) so restore-by-phrase still works via GraphQL.

**Price:** fixed local ₸ equivalent of ~USD 3 covers storage (cents), Kaspi fees, Turbo overhead, and margin / site endowment.

### C. Why not “fund the user’s AR address”

Possible, but worse for UX and ops. Kept only as **fallback** behind `VITE_PUBLISH_MODE=self` / secondary button.

### D. Better-than-MVP (Phase 3.6)

**Turbo Credit Share Approval:** after payment, edge shares credits to the user’s derived address; client uploads with the user JWK. Schedule after MVP is live.

## Consequences

- Need a tiny Worker with secrets: Kaspi merchant token, Turbo/JWK.
- ADR-0001 amended: “no SEJIRE backend that touches seeds or plaintext trees”.
- Abuse controls: one publish per successful payment; size cap; rate limit.
- Refunds: if upload fails after payment, auto-retry then refund via Kaspi process.

## Non-goals (this ADR)

- Users buying AR / connecting ArConnect for the primary publish path.
- Server-side access to mnemonics or plaintext genealogy.
- Replacing local draft storage.
- Stripe as the KZ primary rail.
