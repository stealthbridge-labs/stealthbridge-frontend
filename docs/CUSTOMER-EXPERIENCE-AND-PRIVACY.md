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
