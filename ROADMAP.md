# StealthBridge Frontend — Product Engineering Roadmap

> **Engineering status: active, Testnet-first development.** This is a living implementation roadmap, not a feature announcement. No real funds, fabricated corridors, invented prices, alleged issuer partnerships or unsupported privacy guarantees. Work is complete only when code, tests, interface documentation and verifiable operational evidence exist.

**Cross-repository contract:** [Frontend](https://github.com/stealthbridge-labs/stealthbridge-frontend/blob/main/ROADMAP.md) · [Backend](https://github.com/stealthbridge-labs/stealthbridge-backend/blob/main/ROADMAP.md) · [Contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts/blob/main/ROADMAP.md) · [SDK](https://github.com/stealthbridge-labs/stealthbridge-sdk/blob/main/ROADMAP.md)

## October 2026 implementation checkpoint and next delivery slices

The living [architecture and delivery guide](docs/ARCHITECTURE-AND-DELIVERY.md) separates what the frontend currently renders from what requires independently verified backends, contracts, signatures and financial partners.

**Verified code/CI baseline:** public marketing pages, opt-in Testnet technical workspace, same-origin GET-only proxy, real configured corridor paging, stale/degraded ledger presentation, source-only three-contract ABI parity, read-only public transaction observation, Freighter public-account connection, checksum-valid local watch-only mode, and browser/security tests. A Vercel `READY` build is not proof of real-money service.

**Priority sequence (not calendar promises):**

| Order | Implementation slice | Acceptance criteria |
| --- | --- | --- |
| F1 | Real staging read integration and consistent SDK models | Backend Testnet passphrase, fresh ledger, Neon `/ready`, actual corridor empty/data state; CI and deployed smoke |
| F2 | Business and Send information architecture | Real states for eligibility, review, unavailable routes, mobile/keyboard and honest privacy disclosures |
| F3 | Signed session and organization approvals | Backend nonce/expiry/origin/network binding, role-aware client, forged-session and cancellation tests |
| F4 | Contract inspection from verified Testnet deployment | True source/WASM/ABI/admin attestation; read-only UI and safe failure before any signing |
| F5 | Separate user-review and transfer experience | Privacy-rail audit, no implicit connect→sign, explicit fees/footprint, failure/recovery and operator release approval |

**Blocked until explicit external evidence:** partner quotes, fiat payouts, verified stablecoin issuance, audited privacy proofs, recipient recovery and any UI that submits payment transactions. Use disabled controls with clear next steps instead of creating a simulated transfer.

## Purpose and products

Build two polished, responsive Next.js applications on a shared design system, each with its own information architecture, privacy disclosures, accessibility requirements, permissions and recovery experience. **Business** serves treasury operators, financial institutions, finance approvers and PSP teams; **Send** serves individual senders and recipients. This repository owns the user experience, wallet integration, and browser-side proof state—not bank settlement, issuer operations or custody.

## Current baseline (code available, not deployed/verified as a product)

- Next.js 16 App Router, TypeScript 7, Tailwind 4, shared editable UI components, GSAP-driven landing, canonical branded SVG.
- Business and Send workspaces connect to the backend's live Stellar RPC metadata and unseeded corridor catalog with truthful error and empty states.
- Freighter public-address permission with network check; signing and value transfers deliberately disabled.
- A live read-only transaction explorer with strict hash validation and limited RPC output.
- GitHub Actions validates landing and guarded Testnet preview with browser-based Chromium tests; independent real-device validation and comprehensive accessibility audits remain outstanding.

## Experience architecture and navigation

**Product shell:** Separate layout groups for Business and Send with reusable brand/navigation/dialog primitives but independent identity, role and UX requirements. Build desktop sidebars, mobile navigation, keyboard commands, service status panel, contextual help, responsive data tables and properly loading skeletons. Route-level error boundaries, not-found states, metadata and no-JS fallbacks. 

**Business information architecture:** Overview, Settlements, Settlement Details, Counterparties, Organizations/Members, Corridors and Assets, Approvals, Reconciliation, Audit Trail, API/SDK Access, Integrations, Notifications and Settings. Financial summaries must come from authenticated, tenant-scoped ledger + backend reconciliation; no hardcoded totals, charts or successful payouts. Present clear distinctions between *quote*, *wallet authorization*, *on-chain result*, *partner settlement*, *reconciled completion* and *recovery*.

**Send information architecture:** Eligibility, destination and payout method, validated quote, source asset and fees, recipient setup, privacy review, wallet connect, deposit/shield, claim/transfer, withdrawal, payout tracking, recovery/help, payment receipts and history. Only display steps when a verified corridor and cryptographic rail actually supports them; otherwise show eligibility or feature-unavailable messaging, not fake progress.

## Design system and brand implementation

Carry the supplied StealthBridge ribbon mark consistently into favicon, web app manifest, illustrations, README and future docs. Create a design-token package for light/dark modes, color semantics, typography, spacing, motion curves, depth, radii, borders, focus states and skeleton loading; implement through Tailwind v4 and shadcn component patterns. Establish foundations for Dialog, Sheet, Form, Input, Select, Combobox, Date Picker, Data Table, Tabs, Stepper, Alert, Toast, Tooltip, Badge, Skeleton, EmptyState and SecureCopy. No interactions should be decorative or trigger a payment without a real handler and confirmation.

**Quality bar:** WCAG 2.2 AA-oriented contrast and interaction targets; screen-reader journeys; all error states reachable by keyboard; reduced-motion alternative for GSAP; no auto-playing motion for confirmation status; mobile landscape/tablet/low-bandwidth testing; predictable form validation and no layout shifts. Visual quality is validated by screenshots, not a marketing promise.

## Live data and service boundaries

The frontend uses a same-origin, explicit-allowlist proxy to HTTPS backend APIs. Switch duplicated handwritten types to a pinned released SDK or generated client once the backend OpenAPI contract is authoritative. Add SWR/Query-style cache with short TTL, retry classification, AbortController, request IDs, backoff and no caching of confidential account data. Use real query state transitions; do not silently substitute fixtures. Display network source, Testnet label, last-updated time, stale/unavailable state, API errors and ledger retention limits.

Support searchable corridors by country, asset/issuer and privacy rail, but **do not equate an enabled database record with a licensed payout partner or live liquidity**. Add asset identity validation, issuer/contract network badge and a verified eligibility state driven by the backend. Render no unsupported countries or partner logos.

## Identity, wallets and permissions

Support Freighter discovery, connected/disconnected states, user consent, account change, wrong network, transaction review, signing cancellation and pending signature. Later evaluate supported wallets through reviewed adapters and test on browsers with/without extension. For Business, implement tenant-selected organization, member invitation/roles, approval rights, session expiry, challenge signing, approval review and audit trail only after backend authentication is built. Never send keys, seeds, encrypted note secrets or raw witnesses to the ordinary backend.

## Privacy and transaction journeys

Define explicitly distinct adapters: institutional Confidential Tokens for concealed values with generally known parties; consumer Stellar Private Payments for a shielded relationship subject to public deposit/withdraw correlations. Review exact alpha SDK compatibility, client proving CPU/memory, note encryption, recovery/backup, payer/recipient communications, private event visibility and wallet signature UX before releasing transfer controls. Inform users when compliance partners, on-chain observers or fiat off-ramps can still learn information. Provide user-confirmable transaction payload disclosure and safe opt-in transaction-hash links.

## Business operations and real financial UX

Build approval queues, quote expiry, policy checks, organization limits, unique settlement references, finality monitoring, reconciliation differences, exception/recovery cases, immutable receipts, export access control and activity history from real authenticated services. Use fixed-decimal arithmetic for all displayed asset amounts; never calculate a production FX quote from JavaScript floating point. Design for asynchronous provider callbacks and delayed/reversed payout.

## Consumer reliability and support

Build human-readable errors for low balance, incorrect network, unsupported asset, stale FX quote, transaction rejection, ledger congestion, privacy-pool outage, receiver-unavailable, note-sync lag, payout review and lost recovery material. Make the recovery flow secure and testable before launch. Feature gates should be server-advertised and independently verified, not edited client flags.

## Testing, security and releases

- Component tests for form validation, empty/loading/error states, API/SDK compatibility and wallet rejection.
- E2E browser tests on desktop/mobile with isolated network fixtures **only in tests**; deployment smoke checks using actual Testnet RPC and configured database.
- OWASP-style validation of XSS, request proxy abuse, URL navigation, CSP, secrets in telemetry, accessibility and passwordless authentication.
- Establish pinned lockfile, CI coverage, visual regression baselines, Lighthouse/accessibility budgets, dependency review, release changelog and preview deployment checks.

## Contributor-ready work and operational deliverables

Existing issues: [Accessible live data UI](https://github.com/stealthbridge-labs/stealthbridge-frontend/issues/1), [Freighter UX](https://github.com/stealthbridge-labs/stealthbridge-frontend/issues/2), [Corridor discovery](https://github.com/stealthbridge-labs/stealthbridge-frontend/issues/3). Additional slices should stay scoped to one user flow, include screenshots and keyboard evidence, and preserve truth about financial operations. A frontend feature is complete only when its API version is pinned, unavailable states are implemented, tests pass and deployed UX is reviewed.
