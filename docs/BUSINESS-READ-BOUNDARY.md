# Business Interface — Real Inputs and Security Boundaries

The private technical preview route `/preview/approvals` now asks for user-provided organization and draft identifiers. It never seeds synthetic companies, recipients, review records, amounts or successful payments.

The form computes a local, unsigned, Testnet-bound SHA-256 business-review envelope by the same reviewed SDK algorithm. Nothing is submitted to the API, ledger, partners or a wallet. Reviewer-count calculations start with **zero** verified reviews and never become financial authorization. The actual backend capability catalog is queried separately so unsupported features appear as unavailable.

The backend offers a strictly authenticated GET for tenant review counts, but the public same-origin preview proxy does **not** accept or forward organization bearer sessions, and the UI does not prompt users to paste credentials. Connecting actual read sessions requires a separately reviewed Freighter sign-in flow, proper origin/domain validation, cookie/session protections, server-side permission checks, and real production/preview isolation tests.

Continue prioritizing a user-centric business treasury surface and an SDK-backed developer environment, rather than claiming fiat payouts, privacy proofs or live Mainnet transfers. Product identity is **StealthBridge** without numbered product release labels.
