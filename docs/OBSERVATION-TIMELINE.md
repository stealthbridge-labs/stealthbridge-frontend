# Public Testnet observation timeline (source-pinned SDK v0.2)

The technical Preview observability page reuses the pure read-only `src/observation-health.ts` source from the StealthBridge SDK, pinned byte-for-byte to SDK commit `3bf69c478461958026839832627042bc3f1b9577` by CI. It consumes only five existing read-only same-origin GET endpoints through `src/lib/bridge-api.ts`: `/v1/network`, `/v1/observer`, `/ready`, `/v1/capabilities`, and `/v1/contracts`. Neither the wallet nor public corridors nor any provider callback is queried to build this timeline.

## What users see

- **Ledger hash agreement:** comparing the latest live RPC to a stored observer checkpoint uses both the ledger sequence and the 64-character hexadecimal ledger hash. An equal sequence but different hash is explicitly a conflict, not a healthy sync. An observer ahead of live RPC is also inconsistent.
- **Observer lag:** a newer live sequence is reported as a non-negative ledger gap, never a payment settlement duration. Missing, stale or unverified checkpoints remain missing, not fabricated.
- **History:** up to 12 timestamped assessments held in this one mounted client component. Opt-in 30-second polling pauses on hidden tabs and stops on navigation; a manual refresh always remains available. Reload removes prior samples; no browser storage, cookie, database or analytics endpoint receives the series.
- **Public evidence copy:** the user can copy a strictly limited JSON receipt containing timestamp, two public ledger sequence numbers, gap, observer comparison and evidence verdict. It excludes RPC hashes, wallet keys, addresses, transfers, quoted amounts, JWTs, provider credentials and private event topics.
- **Accessibility and degraded states:** the table has semantic headers/caption, keyboard accessible refresh/checkbox/copy controls, responsive overflow, reduced-motion styling, live status announcements and explicit warning text. If clipboard permission is denied, a visible nonfatal message is shown.

The SDK `assessPublicObservations` verdict `public-metadata-current` applies **only** to fresh equal-hash public Testnet ledger observations with ready PostgreSQL, disabled financial capability flags, and a verified *source-only* Soroban manifest. This never indicates real contract deployment, zk proof validity, a wallet authorization, issuer relationship or delivered fiat payout. Any unsupported positive financial flag is an **unsupported-claim** warning and leaves payment execution disabled.

## Regression and review

Run `npm run typecheck`, `STEALTHBRIDGE_SITE_MODE=preview npm run build`, and the Playwright safety suite. Its observability tests exercise a valid equal-hash public reading, misleading equal-height/different-hash RPC and observer results, wrong-network rejection, unavailable contracts, browser session reset, copying a sanitized JSON receipt, and continued disabled execution. The copied SDK helper must match the immutable reviewed SDK source revision byte-for-byte; its source pin cannot be replaced with a floating branch or tag. A passing simulated browser test is **not** evidence of live Testnet confidentiality or service uptime.

CI: `node scripts/verify-observation-health.mjs` compares the local pure observation module to the exact immutable SDK revision above before the TypeScript and Playwright build; it never fetches remote data from the user's browser.
