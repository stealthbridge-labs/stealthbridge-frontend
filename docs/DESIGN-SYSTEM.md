# StealthBridge design system

Sources: [`src/app/design-system.css`](../src/app/design-system.css) (app, `sb-`) and [`src/app/marketing.css`](../src/app/marketing.css) (public site, `mk-`). Version 2, 2026-11-26 (v1: 2026-11-24).

## Version 2 (2026-11-26)

v2 moves the whole product to a **light, calm financial interface**. The brand stays: the ribbon logo, deep navy (`#031419`) as the root of the ink and "night" surfaces, and mint (`#80f6db`) as the signature accent. What changed:

- **Canvas** `--sb-canvas #f4f6f5`, white surfaces, hairline `--sb-line`. **Ink** `--sb-ink #0a1a1f` (navy-derived), `--sb-ink-2/-3` for secondary text.
- **Action colour**: on light surfaces mint fails contrast, so primary actions use ink (`sb-btn-primary`) or the deep brand teal `--sb-brand #0b7a66` (`sb-btn-brand`, links, verified state). **Mint is reserved for dark `sb-night` surfaces** (balance card, CTA bands, the product stage) via `sb-btn-mint`.
- **Type**: Geist and Geist Mono via `next/font` (`--font-geist-sans/-mono`). All money uses `sb-num`/mono with tabular figures.
- **Legacy screens** in `globals.css` were mechanically re-lit (lightness inversion, shadows kept dark) so older components sit in the light theme until they are rebuilt. The `Button` component's variants now map onto the v2 tokens with an unchanged API.
- **Motion**: CSS entrance (`sb-enter`), a skeleton shimmer, a success pop on confirmation and a slide-over for detail panels. Public pages use GSAP ScrollTrigger reveals only for content below the fold, so nothing starts hidden. All of it is off under `prefers-reduced-motion`.

### App shell

`AppShell` (`src/components/app-shell.tsx`): a desktop sidebar (`navigation "Product areas"`, grouped Money · Planning · Business · Account) and a top bar with the page title, Testnet pill, account chip and sign-out. Below 1024px: a bottom tab bar (`navigation "Quick navigation"`: Home, Send, Activity, Accounts, More) and a "More" bottom sheet (`dialog`). Overlays (side panels, sheets) render through a portal because animated ancestors create containing blocks for `position: fixed`.

### v2 primitives (additions)

Shell: `sb-app`, `sb-sidebar`, `sb-nav`/`sb-nav-item[aria-current]`, `sb-topbar`, `sb-network`, `sb-account-chip`, `sb-content`, `sb-tabbar`, `sb-drawer`, `sb-side-panel`. Layout: `sb-split`, `sb-grid-2/3`, `sb-section-head`. Data: `sb-stat`, `sb-night`, `sb-list`/`sb-row`/`sb-row-button`, `sb-amount-out`, `sb-receipt-amount`, `sb-segmented`. Flow: `sb-stepper li[data-state]`, `sb-amount` (large amount input with asset select), `sb-result-icon[data-tone]`, `sb-spin`. States: `sb-skeleton`, `sb-empty`, `sb-field-hint`/`sb-field-error`, `sb-input[aria-invalid]`. Public site: `mk-header`, `mk-hero`, `mk-stage` (illustration, captioned as not real data), `mk-facts`, `mk-steps`, `mk-audience`, `mk-capabilities` ("working today" vs "in development"), `mk-band`, `mk-footer`.

### Data honesty in v2

Money data comes from one hook, `useMoney` (`src/lib/use-money.ts`): deployments, live balances read from Stellar, and payment history from the backend. A failed read is shown as **unavailable** and is never rendered as zero or "no payments". Statuses map 1:1 to backend states (`confirmed` → Completed, `submitted` → Processing, …). Every receipt states that a standard Stellar payment is **public**.


## Brand (v1 notes, still true for the logo and night surfaces)

The existing logo (`public/brand/`) and colours are kept. Deep teal surfaces (`#031419`), mint accent (`#80f6db`), pale ink (`#eaf9f6`). The tokens below formalize them; they don't replace them.

## Rules

1. **New and redesigned screens use only `--sb-*` tokens and `sb-` primitives.** No raw hex values, no page-specific colour classes.
2. **Mint is for action and verified state**, not decoration. One primary button per view.
3. **No invented data.** Empty, loading, unavailable and error states are designed, not hidden. "Active", "verified" and "deployed" appear only for state the backend observed (on-chain or from a signed provider callback).
4. **Customers never need protocol vocabulary.** XDR, RPC, Soroban, witness and similar terms belong in developer and advanced views. Explorer links are offered, not required.
5. **Accessibility:** 44px minimum touch targets, visible focus (`outline: 2px` mint), labels on every input, `role="status"`/`role="alert"` for async messages, no horizontal scroll at 390px.

## Tokens

| Group | Tokens |
|---|---|
| Brand | `--sb-brand-50 … 800` (300 = brand mint) |
| Surfaces | `--sb-surface-0` page · `-1` section · `-2` card · `-3` raised/input; `--sb-border`, `--sb-border-strong` |
| Ink | `--sb-ink`, `--sb-ink-muted`, `--sb-ink-subtle`, `--sb-ink-on-brand` |
| Semantic | `--sb-success`, `--sb-warning`, `--sb-danger`, `--sb-info` |
| Privacy | `--sb-privacy-protected` (cryptographically protected), `-encrypted` (encrypted off-chain), `-public` (public on the ledger), `-unavailable` |
| Type | `--sb-text-xs … 2xl`, `--sb-leading`, `--sb-font`, `--sb-mono` |
| Space | `--sb-space-1 … 7` (4px grid) |
| Shape and motion | `--sb-radius-sm/md/lg/pill`, `--sb-shadow-1`, `--sb-ease`, `--sb-duration` |

## Primitives

`sb-page`, `sb-page-header` (+ `sb-eyebrow`), `sb-section`/`sb-section-title`, `sb-card`/`sb-card-row`, `sb-btn` + `sb-btn-primary`/`sb-btn-secondary`, `sb-field`/`sb-input`/`sb-check`, `sb-badge[data-tone]`, `sb-alert[data-tone]`, `sb-details` (key/value), `sb-mono`, `sb-link`, `sb-checklist` (`data-state="done|todo|unavailable"`), `sb-privacy-facts`/`sb-privacy-fact[data-level]`.

## Privacy language

Each privacy statement names the mechanism and one level: **protected** (a cryptographic guarantee was verified), **encrypted** (encrypted off-chain; StealthBridge cannot read it), **public** (visible on Stellar), or **unavailable**. A transparent Stellar payment is never labelled confidential. Today no on-chain confidentiality is live (see the contracts repo, ADR-0002), so **protected** is used only for keys that never leave the device.

## Page-by-page redesign checklist

Status: ✅ on design system v1 · 🔶 functional, legacy styling · ⛔ preview-only (404 in production)

| Route | Status | Notes |
|---|---|---|
| `/app` Home | ✅ v2 | Live balances, security checklist, recent activity, profile greeting, shortcuts |
| `/app/send` Send | ✅ v2 | Stepper: recipient → amount → review (fees, privacy facts) → passkey → result. Corridor deep links redirect to `/app/routes` |
| `/app/activity` | ✅ v2 (new) | Filterable history; slide-over receipt with status timeline and ledger link |
| `/app/routes` | 🔶 | Corridor planner moved here from `/app/send`; legacy component, re-lit |
| `/app/accounts` Smart accounts | ✅ v1 | Real passkey creation; inherits v2 tokens |
| `/app/instructions`, `/app/settings`, `/app/business*` | 🔶 | Inside the v2 shell; legacy components re-lit; rebuild next |
| `/`, `/send`, `/business`, `/discover/*` | ✅ v2 | Shared header/footer; honest "working today / in development" capability split |
| `/platform`, `/routes`, `/login` | 🔶 | Re-lit legacy layouts; rebuild on `mk-` primitives next |
| `/preview/*`, `/explorer`, `/wallet` | ⛔ | Developer and operator surfaces |

## Marketing surfaces, motion and existing primitives

Carried over from the previous marketing design guide. v2 note: the home page no longer uses MotionPathPlugin packets or a dark canvas, and the colour values below describe the original dark theme (now used only on `sb-night`/`mk-stage` surfaces). The accessibility, reduced-motion, CTA-contrast and GSAP lifecycle rules all still apply. Where it conflicts with the rules above (for example raw hex values), the token rules win for new work.

**Thesis:** Move value. Not exposure. Express a world of connected opportunities through subtle, directional light, protected routes, translucent architectural objects and substantial editorial typography. Product sites must never route a public visitor to a codebase, engineering issues or source roadmaps.

### Brand

Keep the approved StealthBridge cyan/teal ribbon icon in `public/brand/`. Navy `#031419`, surface `#092129`, mint `#80F6DB`, sky `#80B9FF`, primary type `#EAF9F6` and secondary text `#99B7B8`. Large heads, small uppercase editorial labels, narrow readable prose, generous white space and transparent limitations.

### Public surfaces

`/`: positioning + living schematic, selectable product cards, responsible privacy principles.

`/business`: institutional settlement, confidentiality, organizational oversight, reconciliation.

`/send`: consumer-first remittances, responsible privacy choices and delivery clarity.

`/platform`: modular platform philosophy, privacy model differences, blockchain/off-chain distinction.

All pages are information products at this stage. No fabricated corridor, provider name, FX quote, transaction hash, fund success state, or performance statistics.

### Motion language

- **GSAP entrance**: header + headline reveal through motion and blur, settling into a stable readable position.
- **GSAP MotionPathPlugin**: soft packets travel across the conceptual settlement board following its curved routes. They represent *connection*, not transfer completion.
- **GSAP ScrollTrigger**: perspective chapters and value cards rise into place when scrolled into view.
- **GSAP ambient**: orbital glow, barely floating board, softened breathing highlights.
- **Interactive**: Business/Send selector crossfades and subtle hover/tactile responses.
- **CSS**: restrained moving aurora headline, rotating arcs and light sweep on primary CTA.

Respect `prefers-reduced-motion: reduce`: disable looping and entrance animation in JavaScript and CSS, never use visibility:hidden as a static starting state and leave all content readable. No motion should claim on-chain finality or actual fiat payout.

### Accessibility & responsive quality

Keyboard-visible focus, aria-expanded mobile navigation, semantic anchors for product exploration, meaningful screen reader labels, legible dark/light contrast, no hover-only content, flexible product cards on mobile, high-contrast error/availability text. Audit with real browser screenshots and screen reader; do not infer conformance from code alone.

### Interaction primitives and navigation

Use `Button` (`src/components/ui/button.tsx`) for consistently styled action links and button controls. The primary mint button identifies one meaningful CTA per section; outline/secondary styles show alternatives; glass is reserved for surfaces over artwork; danger should be reserved for truly destructive, future authorized actions. Buttons have visible focus rings, accessible 44–48px targets on mobile, deterministic disabled states and reduced-motion fallbacks. `asChild` must wrap one real link, not a nested button.

`SiteEnhancements` adds a passive scroll-progress indicator and a visible, keyboard-operable Back to Top button after meaningful scroll depth. These are navigation aids only, not financial-state indicators.

### Primary CTA color regression (2026-10)

The mint CTA must use a **dark ink label and icon**, never inherited white text. Root cause: an unlayered global `a { color: inherit }` style out-ranked Tailwind's layered `text-*` utilities on anchor-as-button controls. The global anchor reset now lives inside `@layer base`, and explicit `data-variant` selectors reinforce every Button variant.

The automated browser test `tests/browser/button-contrast.spec.ts` reads computed CSS colors and checks at least 4.5:1 for primary mint buttons across the homepage and three product pages. Keep icon strokes bound to `currentColor`, avoid hover contrast regressions, and test tablet/mobile sizes. Marketing link buttons should have readable 14–15px labels and approximately 52–56px touch heights.

### GSAP lifecycle and visual-evidence regression gate

The Playwright `motion-regression.spec.ts` exercises **all four public routes** in normal-motion desktop/mobile and reduced-motion Chromium. It captures full-page screenshots and route recordings under the CI artifact `marketing-motion-evidence`, without accessing private workspaces, wallets or accounts. The browser additionally asserts reduced-motion text remains fully visible, no JS runtime errors appear and repeated client-side product navigation does not accumulate ScrollTrigger instances. The inert DOM attribute `data-stealthbridge-gsap-triggers` reports only a count of GSAP triggers for leak detection; it contains no user or payment data and is cleared when each context reverts.

Each GSAP context is created inside a React effect and reverted on unmount. The CSS `prefers-reduced-motion: reduce` cascade suppresses ambient/transient motion and the React effects never start looping GSAP animations in reduced mode. Review desktop/mobile screenshots and videos for actual visual quality; a passing automated test does not replace a screen-reader or device audit. All routing illustrations describe **conceptual** movement, never settled transfers.

### Shared editorial marketing primitives

The five typed presentation primitives live in `src/components/marketing/primitives.tsx` and are consumed through `ProductStory` on **Business**, **Send** and **Platform**:

| Primitive | Public API | Semantic and visual contract |
| --- | --- | --- |
| `ProductNavigation` | `current`, `menuOpen`, `onNavigate` | Real Next.js links, descriptive nav label, aria-current, mobile menu delegation |
| `EditorialSectionHeading` | `eyebrow`, `title`, `description`, optional `id` | Semantic h2, editorial section label, readable summary |
| `StoryActionGroup` | No props (deliberate safe anchor target) | Real anchor to the editorial overview, never a payment command |
| `AvailabilityDisclosure` | No props | Explicit “In development” with decorative indicator hidden from assistive tech |
| `NarrativeFeatureBlock` | `index`, `title`, `body` | Semantic article/h3, data provided by the reviewed product story only |

The primitives preserve the existing `story-*` classes and existing color/spacing tokens. `data-slot` attributes are stable non-interactive test hooks; do not style them as substitute product claims. Every reusable component works across all three public product stories without requiring database fixtures, provider identities or payment data.

**Demo/test strategy:** `tests/browser/marketing-primitives.spec.ts` is the in-repo component harness. It checks three semantic section headings, three features, accessible navigation/current-page state, keyboard activation of the narrative CTA, explicit non-operational availability and mobile/desktop overflow. The CI artifact `shared-marketing-evidence` retains representative full-page screenshots; reviewers should compare them against the preceding production/main branch screenshots before merge. No external Storybook deployment is required.
