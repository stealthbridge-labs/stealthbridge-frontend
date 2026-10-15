# Product flows — real integration milestone

StealthBridge Business and Send show live backend/ledger data and wallet state. Transfers are not enabled.

## Current Business
- Observe the actual Testnet RPC ledger head (or a truthful RPC failure).
- Select an operator-configured institutional corridor from database results if one exists.
- Inspect privacy capability and issuer identity stored in the catalog (which is *not* issuer certification).
- Request Freighter public-address access and verify Testnet network.
- View explicit "not enabled" until the cryptographic rail, compliance process and settlement engine are functional.

## Current Send
- Observe the actual network state and only database-configured private-payment corridors.
- Connect Freighter on Testnet (does not create private notes or transfer money).
- Do not show balances, rates, payees, transaction history or payouts unless retrieved and verified from real integrations.

## Next
Business: verified confidential amount transfer, issuer policy and authenticated settlements.
Send: verified SPP deposit/transfer/withdraw, note protection and recovery, real payout provider integration subject to licensing and compliance.

No fictional data, seeded countries, placeholder prices or invented "live" settlement statuses in runtime product screens. Fixtures may only appear in isolated tests.


## Public Testnet observability workspace

The preview-only `/preview/observability` route connects the Next.js same-origin GET-only proxy to five guarded backend responses: `/v1/network`, `/v1/observer`, `/ready`, `/v1/capabilities`, and `/v1/contracts`. The typed read-only response models come from the pinned SDK-generated wire snapshot. No signing or transaction submission is added.

The new page presents independently classified live RPC freshness, persisted observer checkpoint, database readiness, unverified Soroban interface status, and immutable false financial capability flags. A stale ledger, missing observer row (404), unavailable database (503), invalid capability payload, wrong network passphrase or failed backend call **must not** be silently rendered as green. The checkpoint is considered aligned only when *both* records are recent and its ledger sequence does not exceed the observed live ledger. The source-only contract status cannot imply actual deployment.

The `Refresh observations` control re-queries every source with a single abortable lifecycle. Browser safety tests exercise a successful read-only source state, stale/recovery states, missing dependencies, capability flag spoofing, wrong network, mobile overflow, and a five-GET-only outbound call inventory.

Release policy remains unchanged: production marketing cannot serve this route, Vercel Preview must set `STEALTHBRIDGE_SITE_MODE=preview`, and neither environment is permitted to sign, submit or settle funds. All visual statuses refer to **public Testnet metadata only**, not private balances, provider eligibility or bank settlement.
