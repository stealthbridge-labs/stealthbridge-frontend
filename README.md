# StealthBridge Frontend

**Engineering roadmap:** [View the repository-specific plan](ROADMAP.md).

<div align="center"><img src="public/brand/stealthbridge-logo.svg" alt="StealthBridge — Confidential payments. Without borders." width="760" /></div>

**Confidential payments. Without borders.** Next.js 16 / TypeScript 7 / Tailwind CSS 4 / Freighter / GSAP.

[Business](https://github.com/stealthbridge-labs/stealthbridge-frontend/tree/main/src/app/business) · [Send](https://github.com/stealthbridge-labs/stealthbridge-frontend/tree/main/src/app/send) · [Backend API](https://github.com/stealthbridge-labs/stealthbridge-backend) · [Contracts](https://github.com/stealthbridge-labs/stealthbridge-contracts) · [SDK](https://github.com/stealthbridge-labs/stealthbridge-sdk)

## Deploy the landing page now

**No backend, database, wallet credentials or environment variables are needed.** The public site now includes complete product-story pages for **Business**, **Send**, and **Platform**, with animated presentation and no links sending visitors to source code. Technical preview tools remain gated.

1. Open **[Vercel → New Project](https://vercel.com/new)** and import `stealthbridge-labs/stealthbridge-frontend`.
2. Framework **Next.js** · Root Directory **`./`** · Node.js **22.x**. Leave the detected build and install commands unchanged.
3. Click **Deploy**. The homepage becomes available at the HTTPS URL Vercel provides.
4. Share the resulting address for an actual visual and mobile/browser review.

See the [deployment walkthrough](docs/DEPLOYMENT.md). The default landing state is checked in GitHub Actions using `npm run test:landing` after the Next.js production build.

To enable the work-in-progress routes later, deploy the Rust backend first and configure `STEALTHBRIDGE_SITE_MODE=preview` and the server-only `STEALTHBRIDGE_API_URL=https://your-backend` value in Vercel Project Settings, followed by a redeploy.

## Current functionality
- Animated product landing, accessible Business/Send/Platform marketing pages, guarded integration workspaces, and a read-only transaction explorer.
- **Actual Stellar Testnet ledger data** fetched from the configured backend; the backend verifies the RPC network passphrase.
- **Real operator-configured corridors** fetched from backend PostgreSQL, or explicit unavailable / empty states.
- Freighter browser wallet public-address connection and Testnet passphrase validation.
- Transaction hash lookup showing on-chain inclusion/failure without raw XDR or claims of fiat payout.
- Honest capabilities: fund-moving flows remain disabled until cryptographic integrations are verified.
- No mock transfers, seeded FX rates, hardcoded countries/partners, or fake balances.

**Important:** A connected RPC or wallet does **not** mean confidential transfers, real remittances, KYC, fiat payout, or asset custody work. Payment submission is intentionally unavailable. No real money.

## Run locally

Requires Node.js 22+. The default public landing requires no backend or Stellar RPC access. Preview workspaces require a configured Rust backend.

```bash
npm install
cp .env.example .env.local
npm run typecheck
npm run build
npm run dev
```

## Browser tests

The Playwright suite builds on the same backend-free landing mode as the existing HTTP smoke check. It starts an isolated production server on `127.0.0.1:3199` and runs Chromium at desktop, narrow-mobile and reduced-motion settings.

Install the pinned Chromium build once, then build and run the suite:

```bash
npm install
npx playwright install chromium
STEALTHBRIDGE_SITE_MODE=landing npm run build
npm run test:browser
```

Use `npx playwright test --ui` for interactive debugging, or `npx playwright show-report` after a run. Failures retain a trace and full-page screenshot under `test-results/`; CI also uploads `test-results/` and `playwright-report/` as the `playwright-artifacts` artifact. No backend, wallet extension, Stellar key or payment credential is required.

The lightweight `npm run test:landing` HTTP check remains available and runs before the browser suite in CI.

For the landing, leave the environment unset. For private technical previews, set `STEALTHBRIDGE_SITE_MODE=preview` and `STEALTHBRIDGE_API_URL=http://localhost:8080` locally, or an HTTPS backend URL on Vercel. The server-side API proxy is read-only and allowlisted. The landing mode serves public product storytelling at `/business`, `/send` and `/platform`. It returns 404 for internal `/preview/business`, `/preview/send`, `/explorer` and the API proxy.

### How data flows

```
Browser → same-origin /api/bridge/v1/* → Rust Backend
                                         ├─ Stellar Testnet RPC (verified getNetwork/getLatestLedger)
                                         └─ PostgreSQL corridor catalog (operator config, no seed data)
Browser → Freighter extension → public wallet address + actual network (read-only)
```

The SDK provides equivalent typed read-only methods. Integrating a published SDK package and actual confidential transaction adapter remains future work.

## Source layout
- `src/app/page.tsx` and `src/components/home.tsx`: product landing with concept artwork
- `src/app/business/page.tsx`, `src/app/send/page.tsx`, `src/app/platform/page.tsx`: public product descriptions
- `src/app/preview/business/page.tsx` and `src/app/preview/send/page.tsx`: guarded read-only integration workspaces
- `src/components/workspace.tsx`: available corridor selection and restrictions
- `src/components/wallet-connect.tsx`: Freighter user consent + wrong-network detection
- `src/app/api/bridge/[...parts]/route.ts`: strict, read-only server proxy
- `src/hooks/use-bridge.ts`: network / corridor / capability requests with errors and refresh
- `docs/DESIGN-SYSTEM.md`, `docs/DEPLOYMENT.md`: style and deployment requirements

## Status and contribution
Frontend and SDK CI provide remote build validation. Do not claim live payment flows, partner support, security audits, or production readiness.

View [contribution guidance](CONTRIBUTING.md). Licensing decisions are documented through the project's open development governance. Only contribute non-sensitive research/code while the security policy is finalized.

## Refined interface controls

The shared shadcn-compatible `Button` supports `primary`, `secondary`, `outline`, `glass`, `ghost` and `danger` appearances, with improved keyboard focus, disabled semantics, responsive tap targets and safe `asChild` links. Marketing pages also have a minimal scroll-reading indicator and an accessible Back to Top action, respecting reduced-motion preferences. These controls do not initiate or simulate payments.

## Detailed developer guide

[Read the implementation and integration guide](docs/PRODUCT-SITE-GUIDE.md) for current API boundaries, usage, verification and security requirements.
