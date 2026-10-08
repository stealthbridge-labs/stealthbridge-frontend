# StealthBridge public website — implementation and experience guide

## The four public routes

| URL | Message | Visitor action |
|---|---|---|
| `/` | Move value. Not exposure. | Learn about Business, Send and the Platform |
| `/business` | Confidentiality and oversight for institutions | Explore settlement product concept |
| `/send` | Remittances designed for people and responsible privacy | Explore consumer product concept |
| `/platform` | One modular foundation with distinct privacy models | Understand how products fit together |

**Public CTAs stay inside the StealthBridge website.** Developers can find READMEs, code, roadmaps and contributor issues through GitHub; customers should not be redirected to those technical resources as their next product action.

## Frontend architecture

- Next.js 16 App Router, TypeScript, Tailwind CSS v4, shared SVG ribbon brand and shadcn-compatible Button primitives.
- Landing `src/components/home.tsx`, product narratives `src/components/product-story.tsx`, button primitives `src/components/ui/button.tsx`.
- Reusable `SiteEnhancements` adds scroll-progress and Back to Top, without a backend.
- GSAP/ScrollTrigger/MotionPath animations communicate *connection and product direction*, not actual transfer completion.
- Motion and focus styling honor reduced-motion settings and keyboard access. Tests establish functional and build readiness; real-browser screenshot review is separately required.

## CTA and interaction rules

Primary buttons should convey the main action. Use `primary`, `secondary`, `outline`, `glass`, `ghost`, `danger` consistently. Disabled states and focus-visible styles must remain clear; avoid phantom buttons and nested interactive controls. Product animations should not obstruct reading or imply that simulated events are money movement.

## Integration preview separation

Technical preview routes `/preview/business`, `/preview/send`, `/explorer` and `/api/bridge/v1/*` remain guarded in landing mode. When explicitly enabled with `STEALTHBRIDGE_SITE_MODE=preview` plus HTTPS backend URL, they provide live Testnet network/corridor observations and Freighter wallet connection, **not** fund transfer.

The read-only Next.js proxy allowlists fixed endpoints plus strictly validated transaction-hash and corridor-UUID paths. No generic forwarding to arbitrary networks.

## Quality verification

```sh
npm ci
npm run typecheck
npm run build
npm run test:landing
```

Playwright suites and the deployment smoke command cover browser navigation and backend connectivity as separately defined in [smoke-testing](SMOKE-TESTING.md). Production marketing mode requires no signing credentials or database.

## Next milestones

Review desktop/mobile screenshots of the deployed site, accessibility audits, component primitives, route-level SEO assets, live operator-verified corridor eligibility (technical staging only), tenant identity, and independently proven financial integrations. See [ROADMAP](../ROADMAP.md) for the full plan.

## Accessible product education and FAQ

Business, Send and Platform pages now contain product-specific native `details/summary` sections with truthful answers about supported privacy boundaries, settlement status, financial availability and deployment responsibilities. The FAQ is keyboard-operable without JavaScript, mobile responsive and reduced-motion friendly. Mobile navigation closes with Escape as well as the toggle. Browser tests cover these interactions. Do not replace this content with fictitious provider details, balances or launch dates.

## Technical corridor discovery pagination

The same-origin Next.js backend proxy allows the bounded `/v1/corridors/page` route in **preview mode only**. It forwards only `limit` (1–100) and `after` (well-formed UUID), rejecting unknown query keys and duplicates. No user-controlled URL or arbitrary RPC method is forwarded. The public marketing site continues returning 404 for this route in landing mode.

## Public-ledger checkpoint visibility in staging

`/api/bridge/v1/observer` is now allowlisted **only in explicit preview mode**. It returns the last real backend-observed Testnet ledger head when an operator has enabled the durable observer; absent state and storage failure remain explicit errors. This is a read-only operational health signal, not proof that any settlement or user transfer occurred.

## Progressive corridor discovery in engineering preview

The existing internal Business/Send workspaces now request `GET /v1/corridors/page?limit=25` instead of downloading every configured corridor up front. A visible **Load more corridors** control follows the API's opaque UUID cursor; loaded records stay on screen if the next page fails, and the UI clearly explains that search covers *currently loaded entries*. Refresh resets pages. This keeps the marketing routes unchanged and reduces data transfer and memory use as the actual operator catalog expands.

Pagination is not proof a corridor is financially active. No synthetic countries, asset issuers or completed payments are seeded.
