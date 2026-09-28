# Solana preservation implementation

Date: 2026-09-28. This is a testable prototype, not a completed production-payment certification.

## Decision and scope

Use SOL-funded Turbo uploads with a browser wallet. No Solana program, treasury private key, payment backend or SEJIRE token is required for this slice. Solana supplies payment/signing; Arweave supplies archival storage. This is not Solana Pay merchant checkout and does not charge an application fee.

Sources: [Turbo SDK](https://docs.ar.io/sdks/turbo-sdk), [Turbo credits](https://docs.ar.io/build/upload/turbo-credits), and installed `@ardrive/turbo-sdk` 2.1.0 source. SDK code was checked for pricing units and `OnDemandFunding` cap semantics.

## Implemented behavior

- `VITE_SOLANA_NETWORK` defaults to `devnet`. Explicit fixed RPC, payment-service and upload-service URLs prevent mixing the test/prod services.
- Phantom/Solflare connects only on a user click. A cloned adapter guards the public key before every signing request; the wallet extension object is not modified.
- Existing `sejire/envelope/v1`, `sejire/v0.3`, AES-GCM and vault derivation remain compatible. Only validated ciphertext envelope fields reach the upload call; tags contain no family names, dates, notes or recovery words.
- Quote covers payload plus 4 KiB of signature/tag overhead. Turbo's decimal SOL quote is converted exactly to integer lamports, with 10% movement allowance and an absolute 0.01 SOL storage-top-up cap. This cap excludes Solana transaction fees. Existing credits/free allowance can make the payment zero. Unused credits remain associated with the wallet.
- Quote binds network, address, envelope SHA-256 and a 120-second expiry. Funding uses the same cap. Double-clicks are locked; the user must re-consent after a failed/stale quote.
- A successful response produces a network-labelled, downloadable receipt containing the service response and the ciphertext hash. Receipt is saved in browser storage immediately, where available; mainnet acceptance also records the encrypted local archive before the dialog is dismissed.
- Acceptance is shown as **accepted by Turbo**, not independently verified final settlement. Testnet receipt IDs never replace the mainnet vault head. An encrypted backup is available before and after upload.
- An interrupted or rejected request is not labelled unpaid: an approved top-up might already exist. The user is directed to inspect wallet/Turbo credits and keep the encrypted file before retrying. There is no custom automatic payment retry loop.
- A newly generated random SEJIRE key can create its first encrypted copy offline. An existing key with no local backup refuses to publish when gateways are unavailable. HTTP 429/5xx/malformed JSON are not interpreted as a missing archive. Restoring an archive caches the entire vault, including its other trees.

## Configuration

Copy `apps/web/.env.solana.example` to `.env.local` for local development. Environment values are public build-time configuration; never place secrets in `VITE_*` variables. The committed Pages workflow selects devnet and hides QA cashier navigation. Mainnet activation is intentionally explicit and has not been done.

## Verification performed

- Full repository `npm test`: web suites plus sponsor suite (46 sponsor assertions).
- TypeScript and Vite production build.
- New regression tests: envelope encryption roundtrip and plain-data rejection; invalid/oversized envelopes; decimal SOL to integer lamports; zero-price and maximum caps; expiry, wallet, digest and network binding; parent-tag validation; wallet-change signing refusal; HTTP gateway error classification; offline no-backup refusal and local preservation.
- Read-only calls to both live Turbo pricing environments returned valid quotes through the SDK. No wallet connected, transaction signed, payment sent or archive uploaded in that check. The quoted maximum for the small synthetic sample was about 3,400 lamports at that moment; this is not a guaranteed charge or a future price.
- Zero-budget devnet integration check with an ephemeral signing adapter: Turbo requested a top-up; SDK rejected it because the configured maximum was zero, before any transaction signature. No payment or successful upload occurred.
- Browser smoke check: international landing, tree creation, recovery-word confirmation, entry into the devnet Solana panel and the unavailable-wallet message; no browser console errors in that path. Russian and Kazakh landing layouts were also inspected at 390 px width.

Read-only pricing check can be repeated with `apps/web/node_modules/.bin/tsx scripts/solana-quote-smoke.mts`. It is deliberately outside CI because it depends on external services.

## Outstanding acceptance before mainnet/submission claims

1. Connect real Phantom and Solflare in supported browsers; reject connection/signature, change account, and repeat with no balance.
2. With synthetic data and test SOL, sign an upload, download its receipt, inspect the actual transaction and Turbo credits, and verify the cap including any top-up minimum behavior. Free uploads must not be described as paid transactions.
3. Interrupt after top-up and before upload acceptance; retry without a duplicate unwanted payment. Confirm the network chosen by the SDK is clearly shown by each wallet.
4. Complete a controlled mainnet run only with an owner-approved spending amount. Retrieve ciphertext from a gateway, compare its hash, decrypt on a fresh browser/device, verify all family relationships and a second stored tree, and inspect actual settlement/indexing.
5. Test the backup download/reimport on Safari, Chrome, iOS wallet browsers and Android. Browser automation did not confirm its download event in the local in-app browser; file download is not yet a passed cross-browser acceptance check.
6. Independently review dependencies and privacy/consent, profile slow mobile startup, and document measured storage/payment cost. Do not use real family data for a public demo.

## Dependency and architectural limitations

At this implementation checkpoint `npm audit` reports **0 critical, 8 high, 6 moderate and 15 low package-level findings**. These counts include parent packages affected by transitive advisories, not 29 independently exploitable application bugs. Compatible fixes removed the existing critical jsPDF finding; an elliptic 6.6.1 override removes older critical versions. Unresolved advisories include bigint-buffer, secp256k1, ws, stream-json, uuid and an elliptic implementation warning. Several involve native/server or unused token code paths, but browser reachability has not been comprehensively established. Do not present them as harmless or as resolved. Audit is reported in CI and is not a substitute for the mainnet release review.

The complete multichain Turbo SDK generates a roughly 1.35 MB minified lazy chunk (about 440 KB gzip), alongside the existing large Arweave wallet chunk. Its polyfills produce a vm-browserify eval warning. Optimize or replace this dependency surface after the supported wallet flow is proven; do not silently ship an obsolete SDK just to reduce the audit count.

Receipt persistence depends on browser storage availability. Browser data clearing can erase drafts, local encrypted archives and receipts. The local-copy warning system is inherited, and the encrypted file plus separately held recovery words remain necessary. A Turbo receipt does not itself contain the recovery key. Key rotation, family access control and encrypted local drafts are not implemented.
