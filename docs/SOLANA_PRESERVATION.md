# Solana preservation implementation

Updated: 2026-09-29. This is a testable prototype, not a completed production-payment certification.

## Decision and scope

Use SOL-funded Turbo uploads with a browser wallet. No Solana program, treasury private key, payment backend or SEJIRE token is required for this slice. Solana supplies payment/signing; Arweave supplies archival storage. This is not Solana Pay merchant checkout and does not charge an application fee.

Sources: [Turbo SDK](https://docs.ar.io/sdks/turbo-sdk), [testnet uploads](https://docs.ar.io/build/testnet/uploading-and-credits/), [testnet retrieval](https://docs.ar.io/build/testnet/accessing-data/), and installed `@ardrive/turbo-sdk` 2.1.0 source. The previous `OnDemandFunding` path was replaced: it can request funding before trying the free allowance.

## Implemented behavior

- `VITE_SOLANA_NETWORK` defaults to `devnet`. Explicit fixed RPC, payment-service and upload-service URLs prevent mixing the test/prod services.
- Phantom/Solflare connects only on a user click. A cloned adapter guards the public key before and after every signing request; the wallet extension object is not modified. It returns a real Solana `PublicKey`, including `toBuffer()` required by the SDK signer (missing in the earlier adapter).
- Existing `sejire/envelope/v1`, `sejire/v0.3`, AES-GCM and vault derivation remain compatible. Only validated ciphertext envelope fields reach the upload call; tags contain no family names, dates, notes or recovery words.
- Quote covers payload plus 4 KiB of signature/tag overhead. Turbo's decimal SOL quote is converted exactly to integer lamports, with 10% movement allowance and an absolute 0.01 SOL storage-top-up cap. This cap excludes Solana transaction fees. Existing credits/free allowance can make the payment zero. Unused credits remain associated with the wallet.
- Quote binds network, address, envelope SHA-256 and a 120-second expiry. Free allowance/existing credits are tried first. A separate unchecked-by-default consent permits one top-up only after HTTP 402. The entire displayed cap may be credited, not just the exact byte cost; unused credits stay with the wallet. No automatic second top-up is allowed for that signed archive.
- A successful response produces a network-labelled, downloadable receipt containing the service response and the ciphertext hash. Receipt is saved in browser storage immediately, where available; mainnet acceptance also records the encrypted local archive before the dialog is dismissed.
- Acceptance is shown as **accepted by Turbo**, not independently verified final settlement. Testnet receipt IDs never replace the mainnet vault head. An encrypted backup is available before and after upload.
- IndexedDB persists the exact signed data-item bytes/ID, network, ciphertext hash, encrypted envelope and optional parent ID. Retries replay those bytes, including after reload. The UI offers earlier attempts explicitly; resuming an earlier snapshot does not include later edits. No mnemonic/private signing key is stored in this journal.
- An in-process guard and Web Locks exclude concurrent uploads for the same network/wallet across tabs. Browsers without durable storage or Web Locks fail closed before funding.
- Before a SOL signature request, the transaction must be a single System Program transfer with the expected sender, fee payer, recipient and lamports. The returned signature and unchanged message are checked. The signed transaction signature is durably journalled **before** the SDK can broadcast. On retry, `submitFundTransaction` reconciles that transfer instead of creating another; an unresolved transfer also blocks funding another snapshot. SDK HTTP automatic retries are disabled for this flow.
- An interrupted request is not labelled unpaid. If acceptance is already known, later local-storage/verification failure does not turn it into a failed payment. The UI keeps receipt export and encrypted backup available.
- A receipt can be imported on the restore screen. Its network selects a hard-coded gateway (never a URL from the file), `/raw/<id>` supplies the exact ciphertext bytes, and SHA-256 plus vault ID are checked before AES-GCM decryption. Both buffered and streamed responses are limited to 10 MiB and requests time out after 20 seconds. Restoration does not require a wallet. Testnet heads never become mainnet parents.
- The accepted screen can verify a gateway download separately. Receipt hash matching is not independent verification of the service's RSA receipt signature or final Arweave settlement.
- A newly generated random SEJIRE key can create its first encrypted copy offline. An existing key with no local backup refuses to publish when gateways are unavailable. HTTP 429/5xx/malformed JSON are not interpreted as a missing archive. Restoring an archive caches the entire vault, including its other trees.

## Configuration

Copy `apps/web/.env.solana.example` to `.env.local` for local development. Environment values are public build-time configuration; never place secrets in `VITE_*` variables. The committed Pages workflow selects devnet and hides QA cashier navigation. Mainnet activation is intentionally explicit and has not been done.

## Earlier verification (before the end-to-end changes below)

- Full repository `npm test`: web suites plus sponsor suite (46 sponsor assertions).
- TypeScript and Vite production build.
- New regression tests: envelope encryption roundtrip and plain-data rejection; invalid/oversized envelopes; decimal SOL to integer lamports; zero-price and maximum caps; expiry, wallet, digest and network binding; parent-tag validation; wallet-change signing refusal; HTTP gateway error classification; offline no-backup refusal and local preservation.
- Read-only calls to both live Turbo pricing environments returned valid quotes through the SDK. No wallet connected, transaction signed, payment sent or archive uploaded in that check. The quoted maximum for the small synthetic sample was about 3,400 lamports at that moment; this is not a guaranteed charge or a future price.
- Zero-budget devnet integration check with an ephemeral signing adapter: Turbo requested a top-up; SDK rejected it because the configured maximum was zero, before any transaction signature. No payment or successful upload occurred.
- Browser smoke check: international landing, tree creation, recovery-word confirmation, entry into the devnet Solana panel and the unavailable-wallet message; no browser console errors in that path. Russian and Kazakh landing layouts were also inspected at 390 px width.

Read-only pricing check can be repeated with `apps/web/node_modules/.bin/tsx scripts/solana-quote-smoke.mts`. It is deliberately outside CI because it depends on external services.

### September 29: portable encrypted recovery

The restore form now retains a selected encrypted archive while the user enters or corrects their recovery words. Submitting with an archive opens that file directly without gateway lookup. A recovery-words JSON can be selected after the encrypted archive without discarding it. Files over 10 MiB, malformed JSON and invalid envelope fields produce localized errors before decryption; an explicit action removes the file and returns to online lookup. RU/KK/EN instructions describe this flow.

Archive, recovery-word and receipt downloads now use a shared DOM-attached link with delayed Blob URL cleanup. The actual archive download was verified in Chrome 154 on macOS; this is not evidence of Safari/iOS compatibility.

Verification on September 29:

- Web selftests and the sponsor suite (46 assertions) pass; TypeScript/Vite production build passes. Lint reports the existing six warnings and no errors.
- The new crypto backup regression checks encrypted roundtrip of two trees, parent-child relationships and revision history, rejects malformed/oversized/tampered files, and verifies full-vault local caching on a fresh device simulation.
- The browser smoke downloads an actual encrypted archive through the Solana panel and imports it into an isolated Chrome profile. Both trees and the parent-child relationship survive; the historical commits remain intact. Wrong words can be corrected without reselecting the file. Malformed JSON produces a user-facing error. Recovery makes zero external service requests.
- Recovery-words file import after archive selection passes. RU/KK restore forms have no horizontal overflow at 390 px. No uncaught browser errors occur in the tested flows.
- All fixtures are synthetic; the browser smoke blocks external requests. It makes no wallet connection, payment, upload or settlement claim.

Reproduce the browser check with Vite running at `http://127.0.0.1:5173` and an independently installed Playwright plus Chrome:

```sh
NODE_PATH=/path/to/node_modules node scripts/recovery-browser-smoke.mjs
```

`SEJIRE_TEST_URL` overrides the dev-server address; `SEJIRE_BROWSER_CHANNEL` overrides the Chrome channel. The script uses app modules through Vite to construct fixtures and is not a production-preview test. Real network recovery remains a separate acceptance check below.

## September 29: live testnet roundtrip and retry safety

`npm run test:solana` now includes wallet-adapter contract tests against the actual SDK, 20 upload/failure scenarios with real Ed25519/data-item signatures and mocked service responses, IndexedDB reload tests, and receipt parsing/retrieval/decryption tests. Scenarios include denied signatures, changing accounts during a prompt, expiry, altered transactions, storage failure before a payment prompt, lost acceptance/payment responses, explicit funding authorization, concurrent attempts, and no second payment. These tests run in the existing CI via `npm test`; they use no funded wallets and make no external service calls.

Three live devnet runs succeeded on 2026-09-29. A disposable software signer signed a synthetic two-tree archive through the same application upload function and real SDK. Turbo accepted it for **0 winc**, the test gateway returned it, exact-byte SHA-256 matched, and AES-GCM recovery retained both trees, parent/child links and history. A fresh journal instance returned the same receipt without another signature. In the third run, deliberately withholding the saved receipt caused a second real POST of the same signed item; Turbo returned the same ID (`Hr2I-wT0ONvPbmPHZDs3EpoDIrkcBdSpUYuPxxu_p7w`), still with one message signature and zero SOL transfers. This proves the real service path and replay, **not** extension approval or the paid path.

The reproducible public-vector run produced data-item ID `_EbfgIBmLRveXVCFwNmsKj2ftw0bJKZoqQE82ahf8S0`. The testnet is ephemeral; later unavailability is expected and is not evidence of permanent storage. The public BIP39 test vector is used only for synthetic data, never for a wallet or a personal archive.

Browser verification imported the live receipt on a separate localhost origin with no cached vault or wallet, rejected a wrong phrase while retaining the selected file, and restored the parent/child tree with the correct public test words. The devnet panel at 390 px had no horizontal overflow and correctly reported both unavailable wallet providers. A transient pre-existing I18n Fast Refresh issue occurred during source edits; clean production-page checks are recorded separately, not described as a clean HMR run.

The production build was then served on a fresh port/origin. Importing the same live receipt and public test words restored the parent/child tree, with no captured browser errors/warnings and no horizontal overflow at a verified 390 px viewport. This check does not depend on Vite's development module imports or injected fixture state.

Reproduce locally (Node 22+, from `apps/web`):

```sh
npm run test:solana
# Opt-in public network test, synthetic data only; SOL transfers are forbidden by the test adapter:
SEJIRE_LIVE_DEVNET=1 npm run test:solana:live
# Optional known public recovery words for manually reproducing the UI restore:
SEJIRE_LIVE_DEVNET=1 SEJIRE_PUBLIC_FIXTURE=1 npm run test:solana:live
```

The live test is intentionally outside CI: free-tier exhaustion, gateway propagation, service failures and testnet expiration are external dependencies. It fails rather than authorizing a payment when the free allowance is unavailable. Output contains only public receipt/evidence fields (and the explicitly selected public test vector); random recovery words and the ephemeral wallet private key are not printed or saved.

### Remaining real-wallet acceptance runbook

Use a **test wallet**, synthetic family data and devnet. Never paste wallet recovery words into SEJIRE. Do not change this to mainnet as a troubleshooting step.

1. In a browser with Phantom, connect, inspect the displayed address/network and archive quote. Reject the data signature once and confirm the tree/backup remain available. Reconnect after changing accounts.
2. Save SEJIRE words separately. Leave top-up authorization off, sign the archive and download both the receipt and encrypted backup. Click Verify download. Repeat with Solflare. A free upload is not a paid transaction.
3. Import the receipt and SEJIRE words in a different clean browser; verify every tree/relationship/history. Do not import wallet seed words. Repeat with the encrypted backup offline.
4. Separately exercise the paid route with owner-approved test SOL after free allowance/credits are insufficient: inspect the single recipient/amount and network fee in the wallet. Reject once. Then approve, simulate a dropped service response, reload, explicitly resume the saved attempt and verify the **same** transaction signature is reconciled. Record the devnet explorer reference and Turbo credit change.
5. Keep the local journal until reconciliation is complete. Clearing browser storage, changing devices or manually transferring funds invalidates the local at-most-once safeguards; these actions require manual reconciliation, not a blind retry. A signed transaction that was never broadcast can remain conservatively unresolved; do not issue a replacement automatically.

## Outstanding acceptance before mainnet/submission claims

1. Connect real Phantom and Solflare in supported browsers; reject connection/signature, change account, and repeat with no balance.
2. With synthetic data and test SOL, sign an upload, download its receipt, inspect the actual transaction and Turbo credits, and verify the cap including any top-up minimum behavior. Free uploads must not be described as paid transactions.
3. Interrupt after top-up and before upload acceptance; retry without a duplicate unwanted payment. Confirm the network chosen by the SDK is clearly shown by each wallet.
4. Complete a controlled mainnet run only with an owner-approved spending amount. Retrieve ciphertext from a gateway, compare its hash, decrypt on a fresh browser/device, verify all family relationships and a second stored tree, and inspect actual settlement/indexing.
5. Complete backup download/reimport on Safari, iOS wallet browsers and Android. Chrome download and isolated-profile file recovery passed on September 29; the in-app browser and other platforms remain unverified.
6. Independently review dependencies and privacy/consent, profile slow mobile startup, and document measured storage/payment cost. Do not use real family data for a public demo.

## Dependency and architectural limitations

At this implementation checkpoint `npm audit` reports **0 critical, 8 high, 6 moderate and 15 low package-level findings**. These counts include parent packages affected by transitive advisories, not 29 independently exploitable application bugs. Compatible fixes removed the existing critical jsPDF finding; an elliptic 6.6.1 override removes older critical versions. Unresolved advisories include bigint-buffer, secp256k1, ws, stream-json, uuid and an elliptic implementation warning. Several involve native/server or unused token code paths, but browser reachability has not been comprehensively established. Do not present them as harmless or as resolved. Audit is reported in CI and is not a substitute for the mainnet release review.

The complete multichain Turbo SDK generates a roughly 1.35 MB minified lazy chunk (about 440 KB gzip), alongside the existing large Arweave wallet chunk. Its polyfills produce a vm-browserify eval warning. Optimize or replace this dependency surface after the supported wallet flow is proven; do not silently ship an obsolete SDK just to reduce the audit count.

Receipt persistence depends on browser storage availability. Browser data clearing can erase drafts, local encrypted archives and receipts. The local-copy warning system is inherited, and the encrypted file plus separately held recovery words remain necessary. A Turbo receipt does not itself contain the recovery key. Key rotation, family access control and encrypted local drafts are not implemented.
