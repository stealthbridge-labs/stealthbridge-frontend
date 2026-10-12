# Read-only integration release gates

Before approving preview changes, verify:

- Marketing deployments cannot expose preview workspaces.
- The same-origin proxy permits GET/HEAD only and rejects POST with 405.
- Backend network identity is Stellar Testnet only.
- Contract discovery remains source-only, unverified and not deployed.
- Payment execution and wallet signing remain disabled.
- Missing RPC and database connections are shown as unavailable, never replaced with fabricated data.
- Browser tests cover keyboard focus, reduced motion, narrow screens and unavailable states.
- SDK and backend wire schemas are reviewed together before release.

These gates do not authorize any mainnet, signing, settlement, payout or real-money operations.

Issue references: #1, #4, #11, #12, #13.
