# Testnet Activity — read-only product workspace

**Route:** `/preview/activity` (Preview only, no search indexing). The public marketing deployment must serve 404 here. The View presents actual **historical public contract event IDs** from the backend observer's PostgreSQL journal; no synthetic runtime entries or manual wallet input.

## Request chain

1. The workspace calls `readObserverActivity` from `src/lib/bridge-api.ts`. Request is a `GET` to `/api/bridge/v1/observer/activity?limit=10` with optional checksum-verified `contract_id` and an opaque composite `before` cursor. SDK v0.2's additive source module is mirrored **byte-for-byte** in `src/lib/observer-activity.ts` until the SDK can be consumed as a reproducible published package.
2. The Next.js same-origin proxy **only exists in Preview mode** and forwards exactly three validated query fields to the configured HTTPS staging backend; unexpected parameters, duplicates, invalid C-StrKeys or cursors return 400 before any backend call.
3. Rust/Axum reads at most 25 rows plus an extra row and up to five observed contract checkpoints, via prepared keyset queries with a 3-second deadline. It performs **no wallet operations or synchronous Stellar RPC polling** in Vercel.
4. Runtime guards assert Testnet-only metadata, exact fields (no raw event XDR), sorted/deduplicated event IDs, cursor integrity, and `payment_execution_enabled=false`. The frontend separately fetches public RPC network metadata to show when the Testnet observation is fresh; a stale/failed RPC never rewrites the historical journal result.
5. The React view renders checkpoint vs unconfigured vs DB-unavailable states, responsive historical event cards, a contract filter, real older-page loads, and external links to inspect public Testnet transactions. It uses abortable reads and does not persist account data.

## Truthful semantics

`checkpoint-present` means the database has a **saved cursor** only. It does not confirm a running observer, current RPC node, actual StealthBridge contract deployment, successful transaction execution, private witness/proof correctness, a banking partner, fiat redemption or a payout. The canonical Testnet Soroban manifest stays `not-deployed`, so legitimate staging screens may have *no events at all*. No page is presented on the public marketing deployment.

## Review gates

- Backend: Rust/SQLx test suite covers malformed query rejection, actual persisted public event records, stable pagination, and omitted private event fields.
- SDK: Node/TypeScript tests reject incorrect StrKey checksum, wrong contract, malformed private data and fabricated payment flags.
- Frontend: Playwright desktop/mobile browser tests verify honest empty states, actual paginated test fixtures, query forwarding, wrong/duplicate filters, DB 503, privacy safety and no signing/write route.
- CI must attach **testnet-public-activity-evidence** screenshots from both browser projects. They are isolated test fixtures, not real wallet or deployed-contract claims.
- For Vercel Preview smoke, ensure backend's separately versioned `/v1/observer/activity` endpoint is deployed. Until real contracts are independently deployed and a durable observer is configured, the expected state is an empty honest journal.

**Operator note:** This milestone does not modify the canonical v0.3 API snapshot used by current SDK/frontend generated types. The additive `observer-activity.v0.1.yaml` extension is pinned separately; promote it into coordinated OpenAPI v0.4 in a later reviewed migration after all consumers agree.
