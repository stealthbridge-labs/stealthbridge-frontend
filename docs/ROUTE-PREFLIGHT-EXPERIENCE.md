# Live route preflight in Send and Business

Both customer payment workspaces now revalidate three independent public facts before displaying a browser-only review: the operator-configured route by UUID, a route-scoped backend preflight, and a separately fetched Testnet ledger observation.

The checks must agree on the exact route fields and ledger sequence. Responses must be fresh, typed and explicitly disavow payments, fees, liquidity, issuer approval, privacy verification and fiat payouts. A discrepancy fails the local review with an actionable error; it never silently falls back to fabricated availability.

The only argument sent to the server is the public route UUID. Amount, recipient address and reference stay in the browser. No submission, debit, provider quote or payment signature is added. Read-only database schema state is shown transparently in the review.

## Public catalog to customer account

Every real operator corridor in the public explorer links to signed-in Send preparation using only a UUID, never an amount or recipient in the URL. The sign-in destination is strictly allowlisted; external redirects and extra query fields are rejected. The Send workspace re-fetches the linked corridor by UUID if it is outside the first catalog page, and checks it against subsequent pages rather than silently accepting changed data. No transfer is submitted.

Ledger observations can differ by up to two blocks due to genuine Testnet progression between independent GETs. Beyond that bound, review fails closed. Both observations independently require fresh validation.
