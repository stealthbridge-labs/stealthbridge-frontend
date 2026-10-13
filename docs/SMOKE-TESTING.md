# Production and staging release smoke matrix

## Public marketing release

Run `npm install`, `npm run typecheck`, `npm run build`, `npm run test:landing` and `npm run test:browser`. CI runs Chromium desktop/mobile, reduced-motion coverage, and both landing and isolated preview builds. Marketing routes `/preview`, `/preview/business`, `/preview/send`, `/preview/contracts` and preview API GETs must be 404; POST to the proxy must be 405.

## Staging read-only integration

Configure **a dedicated preview Vercel deployment** with `STEALTHBRIDGE_SITE_MODE=preview` and HTTPS `STEALTHBRIDGE_API_URL` pointing to the Rust API. The public marketing deployment must not inherit those variables.

Run `STEALTHBRIDGE_REQUIRE_DATABASE=1 npm run smoke -- https://your-staging-host.example`. The optional `STEALTHBRIDGE_VERCEL_BYPASS_TOKEN` is read **from environment only**, never put in the URL, CLI arguments, docs or CI logs. The smoke tool does not echo the token or send payment writes beyond the explicit rejected POST test.

| Signal | Classification | Required action |
| --- | --- | --- |
| API GET returns 404 | PREVIEW_PROXY_BLOCKED | Check that this is the preview deployment and routing flags are correct |
| Network GET returns 502/503 | STELLAR_RPC_UNAVAILABLE | Inspect the Rust backend and Stellar Testnet RPC configuration |
| Corridor catalog/pagination returns 503 | DATABASE_UNAVAILABLE in strict mode | Check Neon connection, migrations and API readiness |
| Manifest is not-deployed, verified=false, empty addresses | Correct undeployed contract discovery | Never advertise activated Soroban contracts |
| Manifest claims deployed/verified or nonempty addresses | Fail the build smoke | Require independent on-chain verification first |
| Corridor page invalid, too large or cursor wrong | CORRIDOR_PAGE_INVALID | Diagnose API/consumer wire drift |
| POST settlement returns 405 | Correct GET-only browser proxy | Any other result blocks release |

The suite runs the full negative-path matrix against **HTTP fixtures** in CI. A CI fixture is not a live Vercel or RPC attestation. An operator must additionally record a passing smoke result from a reachable staging URL before approving a deployment. No private keys, transfer witnesses, real funds or payment authorizations are required.

## Protected two-target Vercel release acceptance

Current project configuration inspection (13 October 2026) shows **Preview** defines `STEALTHBRIDGE_SITE_MODE=preview` and a reviewed backend API origin, while **Production** has no such site-mode override. This is target configuration, **not** a live routing/readiness attestation. The default landing build must continue hiding technical preview routes and API proxy reads regardless of missing Preview variables.

The default-branch, operator-dispatched GitHub Actions workflow `.github/workflows/vercel-release-policy.yml` runs under protected **staging** environment approval. It **requires both jobs to pass** before marking issue #13 complete:

1. `marketing`: set staging environment variable `STEALTHBRIDGE_MARKETING_WEB_URL` to the **exact live Production HTTPS origin**. Its script checks all four public marketing pages return 200; `/preview`, `/preview/business`, `/preview/send`, `/preview/contracts`, `/preview/corridors`, `/api/bridge/v1/network`, `/api/bridge/v1/capabilities` and `/api/bridge/ready` all return **404**; `POST /api/bridge/v1/settlements` returns **405**. Redirects always fail.
2. `preview`: set `STEALTHBRIDGE_STAGING_WEB_URL` to the **isolated live Preview HTTPS deployment**. Its script requires four public pages, actual current Stellar Testnet passphrase/ledger close no older than 180 seconds, bounded corridor pages, connected PostgreSQL readiness, an undeployed canonical Soroban manifest, every payment-availability flag **false**, and settlement **POST 405**. Degraded/missing upstream RPC, disabled API proxy, stale ledger or schema mismatch fails.

For protected Vercel deployments, only supply the distinct, protected environment secrets `STEALTHBRIDGE_MARKETING_BYPASS_TOKEN` and `STEALTHBRIDGE_PREVIEW_BYPASS_TOKEN` when access cannot be achieved through the existing approved Trusted Sources/OIDC path. Secrets never enter repository code, run output, URLs or CLI arguments. Bypass headers are refused for non-Vercel hosts unless the exact host is independently configured as `STEALTHBRIDGE_MARKETING_WEB_HOST` or `STEALTHBRIDGE_STAGING_WEB_HOST`. **Do not disable deployment protection**, broaden unrelated trusted-source rules or re-use any backend provider, bank or payment signing credential for release probes.

CI runs local negative tests for preview exposure, accidentally reachable API GETs, redirected protection credentials and enabled POST. A green fixture suite or Vercel's `READY` build state **does not substitute** for an operator-approved, successful live dispatch. Attach the GitHub Actions run URL, full target deployment commit SHAs, observed fresh Testnet ledger and explicit disabled-payment checks to issue #13 before marking closed. Neither branch may claim that a real private transfer was completed.
