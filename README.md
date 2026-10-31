<div align="center">
<img src="public/brand/stealthbridge-logo.svg" alt="StealthBridge — Confidential payments. Without borders." width="760" />

# StealthBridge — Customer App

**Cross-border payments designed for discretion, clarity, and control.**

[Live product](https://stealthbridge.vercel.app) · [Business](https://stealthbridge.vercel.app/business) · [Send](https://stealthbridge.vercel.app/send) · [Platform](https://stealthbridge.vercel.app/platform)
</div>

## What works today

StealthBridge has a **deployed, authenticated Stellar Testnet customer experience** and a real Rust/Neon-backed planning foundation. Users can explore configured corridors without signing in; sign in using a **SEP-53-style Stellar signed-message challenge** (supported Freighter flow); save an account profile; register and edit **pending** business applications; view actual organization memberships and invitations when enabled; check public recipient presence; and prepare an individual or browser-local CSV payment plan.

**No customer funds can move.** This is not a functioning confidential remittance or custody service. No verified exchange rate, settlement offer, private transfer, bank payout, liquidity, privacy proof, or platform-fee collection is currently available. All payment execution controls remain disabled.

### Product structure

| Product area | Authenticated page | What customers can do |
| --- | --- | --- |
| Overview | `/app` | See their saved preferences, next actions and account safeguards |
| Personal | `/app/send` | Browse real corridor data, check a public recipient with consent, prepare a local transfer review |
| Business | `/app/business` | Register pending organizations, inspect memberships/roles and find relevant workflows |
| Business / one payment | `/app/business/payments` | Prepare a single locally held payment draft with live route checks |
| Business / batches | `/app/business/batch` | Import up to 50 CSV rows locally and check up to 8 distinct public route IDs |
| Business / team | `/app/business/[id]` | View tenant-scoped team details and pending onboarding status |
| Account | `/app/settings` | Edit saved name, purpose and optional country preferences |

The Business hub includes an account-bound snapshot of **real pending applications and active memberships** with explicit unavailable/empty states. Organization detail views provide recorded member roles, deliberately disclosed account/reference identifiers, and a permissions-aware invitation area. Viewer invitations are shown only when a valid active owner/admin record, the backend's invitation-issuance flag, and the site feature setting all permit them; denied/stale information is hidden rather than assumed. Neither saved preferences nor a membership proves identity, legal-entity approval, or financial authorization. Public routes stay separate from authenticated routes. Operator receipts and developer tools are not customer app navigation.

Read [Product structure and user journeys](docs/PRODUCT-ARCHITECTURE-AND-JOURNEYS.md), [Account trust and privacy boundaries](docs/CUSTOMER-EXPERIENCE-AND-PRIVACY.md), and [Business batching](docs/BATCH-LIVE-PREFLIGHT-UX.md).

## How the deployed product connects

```text
Customer browser (Next.js, HTTPS)
   ├─ Public route browsing and recipient presence (GET only)
   ├─ Local payment drafts, local CSV, account UI
   ├─ Wallet challenge → short-lived signed-in session
   └─ Same-origin API routes → Rust Axum backend
                                  ├─ Stellar Testnet RPC (real bounded public observations)
                                  └─ Neon PostgreSQL (real profiles, business applications,
                                      organizations, invitations, corridor configuration)
TypeScript SDK → exact, separately version-pinned read-only backend wire models
Rust Soroban → separately deployed public governance contracts on Testnet
```

The client does **not** sign money-moving transactions or upload recipient nicknames, private amounts, payment references, signing keys, passkeys, or witnesses to the backend from the payment planner. Explicit consent is required before public recipient presence lookup. Configuration records do not establish operational payout corridors.

Backend readiness is a **dependency check**, not release authorization. See the [backend](https://github.com/stealthbridge-labs/stealthbridge-backend) and [contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts).

## Develop locally

Requires Node.js 22+, npm, and the repository lockfile. Public pages run without a database or wallet extension.

```bash
npm ci
cp .env.example .env.local
npm run typecheck
npm run lint
node --test tests/*.test.mjs
npm run build
npm run dev
```

For an actual local backend, keep `STEALTHBRIDGE_API_URL` server-only, pointed at a trusted Axum instance. Keep wallet-authentication, session and account-bridge secrets outside the repository. `STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED` and `STEALTHBRIDGE_TEAM_INVITES_ENABLED` are separately controlled features; the saved profile is **nonfinancial**. Never publish session bridge secrets, operator identities, database URLs or private keys in client bundles.

`.env.example` documents public/preview defaults. [Environment and deployment](docs/DEPLOYMENT.md) and [Authenticated product UX](docs/AUTHENTICATED-PRODUCT-EXPERIENCE.md) describe the server boundaries.

## Verify a release

```bash
npm run test:landing
npm run test:seo
npx playwright install chromium
npm run build
npm run test:browser -- --project=chromium-desktop --project=chromium-mobile
# Deliberately read-only: ephemeral sign-in, real production profile/business GETs
npm run smoke:customer
```

The customer smoke signs a disposable key in memory, uses production cookie-bound login, checks real read-only account responses and authenticates the app pages. **It never creates profiles, organizations, payment instructions, transfers, or chain transactions.** Run it only for the exact allowlisted product origin.

CI checks builds, TypeScript, accessibility-oriented desktop/mobile journeys, public source parity, wallet-signature failures and disabled financial actions. A Vercel READY deployment alone does not prove this evidence; review GitHub checks and the live smoke report.

## Current limits and next engineering gates

1. **Smart-account custody/recovery:** verify WebAuthn origin/RP binding, policies, replay resistance, TTL, and independent lost-device recovery. Read-only code preflight is not account deployment.
2. **Privacy:** independently reproduce end-to-end confidentiality on actual assets and identify any sender, recipient, amount, metadata and regulator-access leaks.
3. **Financial rails:** acquire verified asset issuer, settlement/liquidity, pricing, payment provider and payout evidence and implement reconciliation and dispute handling.
4. **User trust:** verify organization eligibility and regulated payment operations before exposing funding or sending actions.

Do not display internal deployer/operator addresses on customer pages. A customer's *own* public address is only visible after deliberate disclosure in their authenticated account.

## Explore this repository

- `src/app/app/` — signed-in customer pages.
- `src/components/account-navigation.tsx` and `business-overview.tsx` — customer-first navigation and real organization overview.
- `src/components/customer-payment-workspace.tsx` — local, disabled-execution payment planning.
- `src/lib/account-profile.ts`, `business-onboarding.ts`, `account-directory.ts` — strictly validated session-bound account data.
- `src/app/api/` — bounded same-origin backend-for-frontend proxy and wallet sign-in.
- [Architecture](docs/ARCHITECTURE-AND-DELIVERY.md) · [Product flow specification](docs/PRODUCT-FLOWS.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Roadmap](ROADMAP.md)

**Sister repositories:** [Backend](https://github.com/stealthbridge-labs/stealthbridge-backend) · [SDK](https://github.com/stealthbridge-labs/stealthbridge-sdk) · [Contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts).

**Testnet only. No live payments or real-money deposits.**
