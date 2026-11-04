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


## Public customer workspaces (October 20, 2026)

The marketing site's `/send` and `/business` routes now use a dedicated
customer payment workspace rather than reusing the advanced smart-account
inspection panel. This is a **real connected interface**, not a fictional
transfer engine:

- The customer selects a corridor returned by PostgreSQL through the live
  backend `GET /v1/corridors/page`, proxied only by strict, bounded
  `GET /api/public/corridors[?after=UUID]`. Empty results and 503 errors have
  different UI states; additional pages are fetched only when requested.
- The selected corridor determines both the declared asset and privacy rail.
  The UI does not invent another asset, recipient payout currency, FX rate,
  provider quote, issuer approval, or privacy capability.
- Freighter remains the source of a connected public Testnet G-address. The
  customer may explicitly inspect a C-address recipient's live public
  contract instance, but an active contract is not proof of asset support,
  wallet authorization, verified payments, or privacy.
- Send collects the recipient and amount. Business additionally collects a
  customer's own internal settlement reference and distinguishes approval,
  reconciliation, and confidentiality prerequisites.
- Details can be reviewed without network writes. The final send/settlement
  button is intentionally disabled until actual independently reviewed
  payment rails, compliance, quote-provider, and operator controls exist.
- Technical watch-only accounts, passkey research, and contract debugging
  remain available on the separate `/wallet` advanced route, not as the
  main consumer journey.

The backend's `GET /` is intentionally an unindexed 404 response. The API
must stay deployed to serve the product; internal metrics require an operator
bearer token, and tenant review data requires an authenticated session.
The root 404 is not an outage or an operator dashboard.


## Fresh route revalidation during customer review

Before marking an entered Send/Business draft as locally reviewed, the product
re-fetches the exact enabled corridor by UUID through
`GET /api/public/corridors/{id}` (bounded, GET-only same-origin proxy to
Rust `GET /v1/corridors/{id}`) **and** makes a new independent public
Testnet status read. Failure, disabled or removed rows, changed country,
asset, issuer or privacy rail, wrong network, stale ledger, invalid response,
and timed-out reads cause review to fail closed with an actionable message.

Only the public corridor identifier is sent for corridor revalidation.
Recipient wallet address, intended amount, and business reference remain
browser-local in this step. Edits to any of these fields, a wallet change, or
a network refresh invalidate an outstanding review and prevent a late request
from re-enabling it. Reviewing a draft is still **not** a provider quote,
pre-funded payment, signature, compliance approval or transfer submission.
All final send/settlement controls stay disabled. No mock corridor or price
may be supplied to the production experience.

## Private local review fingerprint (November 2026)

After both an exact corridor preflight and a consent-based public recipient
presence recheck, Send/Business creates a **browser-owned** 256-bit random salt
and a SHA-256 integrity fingerprint of the Testnet draft. The exact corridor,
asset, issuer, public addresses, amount and (for Business) internal reference
are bound to the fingerprint, but neither draft nor salt leaves the tab through
this feature. Customers may copy the **hash only**, re-verify locally, and see
it disappear when a field/network/wallet changes. A fingerprint is NOT a ZK
proof, confidential payment, signed receipt, quote or transfer authorization.
No new backend endpoint or on-chain submission has been added. All financial
buttons remain disabled and backend policy stays fail-closed.

Business references in this bounded local-review field now require 3–64 ASCII
letters, digits, underscores or hyphens, avoiding ambiguous canonicalization
and newline injection. The Rust/backend and SDK both pin a cross-language test
vector; contract tests assert the local receipt cannot replace an operator
policy commitment.
