# StealthBridge customer experience and privacy boundaries

People use StealthBridge to understand and eventually move money internationally, not to inspect blockchains. The public site leads with choosing sending and receiving countries, privacy tradeoffs, true availability and delivery clarity.

- Homepage: clear consumer journey, no fabricated live payout.
- Country route search: country-name selection, only real operator-configured backend records, no publicly shown UUID or fake FX rate. Country names are navigational choices, not payout availability.
- Privacy & trust: user-facing descriptions of sensitive amount vs relationship privacy, real-world compliance/provider disclosure and account consent.
- Authenticated customer: public identity behind a user-invoked disclosure, no raw administrator address in normal flow.
- Recipient: fresh Testnet contract presence only, no wasm hash, signers or authorization assertion. A contract is not a smart wallet.

Developer isolation: customer production excludes wallet inspector, preview dashboards, explorer and raw contract introspection. Preview-only mode is not authentication; separately protect staging and internal APIs.

Smart accounts: require pinned audited Stellar Smart Account Kit and OpenZeppelin components, reviewed auth digest, verifier/factory provenance, WebAuthn RP/origin, independent user recovery, spending/approval policies, revoked signers, constrained relayer and real Testnet multi-device tests before product account creation. Existing governance deployments are NOT user wallets.

Payment gates unchanged: no transfers, quotes, verified private payment proofs, fee claims or fiat payouts. Partner, issuer, compliance, RPC, database, audit and reconciliation must be independently verified before real-value execution.


## Next customer journey milestone

A visitor can explore a configured route as a personal or business user without entering an amount or recipient. Only the selected public corridor UUID and the whitelisted destination are preserved through sign-in. In Business, route preparation is visible as a core page section, not collapsed into a technical investigation.

When planning a payment, a person chooses a public G-address or C-address and may assign a browser-tab-only nickname. The nickname, amount, reference and acknowledgement never go to the route or recipient lookup services. The customer must explicitly request a public recipient check, review the full address and confirm it independently. A G-address lookup uses pinned Testnet Horizon; a C-address presence check uses the Soroban instance read. Neither guarantees ownership, asset acceptance, privacy or payouts. Presence evidence expires and must be independently refreshed before any draft review. Review is a nonfinancial informational action, never a submit.

The customer view does not show ledger sequence numbers, the production migration manifest or raw contract WASM hashes. Engineering diagnostics belong in protected internal tools. Keep Testnet-only, no signing and disabled financial execution.


## Saved customer account onboarding after production schema migration

The authenticated app home includes an optional first-party account journey, based on a strict response from the existing GET /api/account/profile BFF. A customer can self-report a name, use case and country through /app/settings only after session verification. The browser renders relevant Send or Business actions based on the saved preference, but never interprets it as KYC, a verified business, country support, a balance or payment authorization. No fictional transfers, liquidity, quotes or ledger events are shown.

STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED=true must be released only after both production BFF and backend have the same server-only STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET, the 12 SQLx migrations are registered, the /v1/account/profile backend is reachable, and an actual signed-in smoke test succeeds. The BFF HMAC is bound to method, path, account, timestamp, nonce and body hash; database one-time update receipts guard PATCH replay. This nonfinancial feature stores self-reported names and country in Neon and must not be marketed as cryptographically confidential.
