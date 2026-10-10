# StealthBridge public website — deployment

The standalone Next.js website at **https://stealthbridge.vercel.app/** introduces StealthBridge without requiring a live backend, signing keys, RPC connection, payout partners or fiat data. The GitHub repository `stealthbridge-labs/stealthbridge-frontend` is already connected to a Vercel project. When Vercel's GitHub integration is enabled, new commits to `main` trigger deployments.

## Public pages

| Route | Experience |
| --- | --- |
| `/` | Motion-rich product landing with private-rail concept visualization and Business/Send switch |
| `/business` | Institutional settlement vision, privacy, audit and reconciliation story |
| `/send` | Human-focused private remittance vision and clear privacy limitations |
| `/platform` | Shared technical philosophy explained in product language |

**No public CTA leads to GitHub, source code or engineering roadmaps.** Navigation and buttons remain on StealthBridge's product pages. The content clearly says the product is in development; no real payment, rate or provider claim is fabricated.

## Deploy / verify

1. Push to the connected repository's `main` branch (or use the Vercel production deployment dashboard).
2. In Vercel, use Next.js, repository root `./`, Node.js 22.x and standard build command `npm run build`.
3. No environment variables are required for public marketing mode. Leave `STEALTHBRIDGE_SITE_MODE` unset or set it to `landing`.
4. Once Vercel finishes, inspect **https://stealthbridge.vercel.app/** and `/business`, `/send`, `/platform` on mobile and desktop.
5. Test the hero load-in, continuous travelling route packets, floating visualization, scroll-triggered sections, product selector animation and user `prefers-reduced-motion` behavior.

GitHub Actions runs `npm run typecheck`, `npm run build`, and `npm run test:landing`. The last command starts the built application without a backend, asserts all four public pages return 200 and contain product copy, checks no HTML links to GitHub/source roadmaps, and confirms technical preview/API routes remain gated.

## Technical previews

The existing non-money-moving engineering workspaces are separated from product marketing:

- `/preview/business`
- `/preview/send`
- `/explorer`

These routes are unavailable by default. Only a dedicated technical staging deployment should set:

```env
STEALTHBRIDGE_SITE_MODE=preview
STEALTHBRIDGE_API_URL=https://your-real-backend.example
```

The API proxy is guarded by the same mode. Preview mode does not activate confidential payments, real fiat payouts or production money movement.


### Managed PostgreSQL staging acceptance

The Rust backend is responsible for Neon/PostgreSQL connections; the frontend
must **never** have `DATABASE_URL`, the Stellar RPC provider token, or any
wallet secret. Before enabling a technical preview, provision Neon on the
**backend Vercel project**, apply its operator-gated migrations and check
`GET /ready` for `stellar_rpc=connected` and `database=connected`. Follow
[the backend managed Postgres guide](https://github.com/stealthbridge-labs/stealthbridge-backend/blob/main/docs/MANAGED-POSTGRES.md).

From a reachable staging environment, run the existing read-only cross-service
smoke probe:

```sh
npm run smoke -- https://YOUR_STAGING_FRONTEND_HOST
# Require real connected Postgres rather than accepting a classified 503:
STEALTHBRIDGE_REQUIRE_DATABASE=1 npm run smoke -- https://YOUR_STAGING_FRONTEND_HOST
```

The strict command requires an actual, recent Stellar Testnet ledger, database
readiness and the real (possibly empty) enabled-corridor catalog. The proxy must
reject POST settlement requests with HTTP 405 and all payment capability flags
remain false. It does not send funds, sign transactions or seed partner records.

The smoke runner distinguishes correctly classified degraded 503 readiness
from an invalid API response; it fails strict staging acceptance when the
database is not connected. GitHub Actions tests these paths using isolated local
HTTP fixtures without contacting a private RPC or live database.

## Design & animation

GSAP / ScrollTrigger / MotionPathPlugin provide intro choreography, curved travelling signals and scroll reveals. CSS adds a subtle headline tint, orbital movement, glow and interactive hover treatments. All motion is decorative: it does not imply actual transaction completion. A `prefers-reduced-motion` check disables nonessential motion and keeps all content visible. See `docs/DESIGN-SYSTEM.md`.

Vercel account access may be required to inspect build logs or protected deployments; a successful GitHub build alone does not prove an updated production URL is visually correct.
