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
