# Governance status product integration

Three governance contracts are deployed on Stellar Testnet with historical on-chain evidence; the public site **must not** equate deployment with active private payment capability.

## Read-only UX states

- **Unavailable:** API or trusted attestation not configured. Display an explicit unavailable message, not an enabled capability.
- **Verification pending:** governance deployment evidence exists, but independent live checks and approved canonical manifest v2 have not been consumed.
- **Verified and current:** show verified *public governance* network, observed ledger, time and registry identifiers only after the Rust API returns a trusted attestation.
- **Stale, paused or changed:** immediately degrade to unverified, with a non-technical error explanation and no financial action path.

The frontend must never verify trust using a source-controlled C-address alone, trust browser-supplied JSON, or expose signing secrets. Use a strict SDK response decoder after the backend read adapter ships. Both Business and Send actions remain disabled until an independent financial/privacy/security release; a wallet authorization popup is not a transfer authorization.

## Acceptance

Test landing mode without backend, preview mode with unavailable backend, stale and wrong-network responses, verification failure, small screens, keyboard access and reduced motion. The live application must not display fictional balances, corridors, provider liquidity or successful settlements.

**Dependency:** Contracts publishes a signed reviewed canonical v2 release; backend validates it through fresh Testnet RPC; SDK adds typed decoding; then frontend can consume status.
