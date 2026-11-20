# Contributing to StealthBridge Frontend

Welcome to `stealthbridge-frontend`, the Next.js (App Router), React, TypeScript web application and same-origin Backend-for-Frontend (BFF) API proxy for StealthBridge Personal, Business, Developer, and Technical Preview experiences.

> **Strict Product & Privacy Integrity:** Zero fabricated balances, fake FX rates, demo customer lists, or simulated payout confirmations. Zero `localStorage`, `sessionStorage`, or `indexedDB` for sensitive account/financial data — all persisted customer records flow through authenticated BFF routes (`/api/account/*`) backed by `stealthbridge-backend` and PostgreSQL.

---

## 1. Repository Architecture

- **App Router pages (`src/app/`):**
  - Public stories: `/`, `/send`, `/business`, `/platform`, `/discover/send`, `/discover/business`, `/routes`, `/login`.
  - Authenticated Personal & Business workspaces (`/app/*`): `/app` overview, `/app/send`, `/app/instructions`, `/app/settings`, `/app/business`, `/app/business/[id]`, `/app/business/payments`, `/app/business/batch`.
  - Technical preview routes (`/preview/*`, gated by `STEALTHBRIDGE_SITE_MODE=preview`).
- **Same-Origin BFF Routes (`src/app/api/`):** Validate cookie session (`currentWalletIdentity`), enforce CSRF origin (`validSameOrigin`), verify strict request envelopes, sign with HMAC-SHA256 (`STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET`), and stream-bound responses.
- **Design & Accessibility:** Read [DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) and [DEPLOYMENT.md](docs/DEPLOYMENT.md). Every interactive control must have a real handler, accessible focus ring, >=44px usable tap target where applicable, and respect `@media (prefers-reduced-motion: reduce)`.

---

## 2. Local Setup & Verification

```bash
npm install --no-audit --no-fund
node scripts/verify-soroban-interface.mjs
node scripts/verify-sdk-wire.mjs
npm run typecheck
npm run lint
node --test tests/*.test.mjs

# Landing mode verification + Playwright browser suite
STEALTHBRIDGE_SITE_MODE=landing npm run build
npm run test:landing
npx playwright install chromium
npm run test:browser

# Preview safety-gate verification + Playwright preview suite
STEALTHBRIDGE_SITE_MODE=preview npm run build
STEALTHBRIDGE_TEST_PREVIEW=1 npm run test:browser
```

---

## 3. Practical Contributor Walkthroughs

### How to Add an Authenticated Feature End-to-End
1. **Verify Backend & SDK Support First:** Confirm the backing endpoint exists in `stealthbridge-backend` and validator/client types exist in `stealthbridge-sdk` (see [CROSS-REPO-INTEGRATION-MAP.md](https://github.com/stealthbridge-labs/stealthbridge-contracts/blob/main/docs/CROSS-REPO-INTEGRATION-MAP.md)).
2. **Add Strict Client Validators (`src/lib/<feature>.ts`):** Validate every request & response property explicitly (`Object.hasOwn` key counts, Protocol 30 StrKey checks via `src/lib/stellar-address.ts`, `payment_execution_enabled === false` where applicable).
3. **Add Same-Origin BFF Route (`src/app/api/account/<feature>/route.ts`):** Require `currentWalletIdentity()`, check `validSameOrigin(request)` on writes, reject query strings/oversized bodies, HMAC-sign requests cleanly, and return `503` if upstream is disabled or unreachable.
4. **Build Accessible UI (`src/components/`):** Always render distinct, honest states for `loading`, `empty`, `ready`, and `unavailable` (retryable without losing unsaved form inputs). Never silently invent fallback data.
5. **Add Regression Tests:** Add unit validation tests in `tests/<feature>.test.mjs` and Playwright coverage in `tests/browser/`.

---

## 4. Review & Disclosure Policy

Changes touching wallet sign-in, session cookies, `/api/account/*` BFF signatures, CSP/headers, or transaction-related UI controls require explicit security review. Follow [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and report vulnerabilities privately via [SECURITY.md](SECURITY.md).
