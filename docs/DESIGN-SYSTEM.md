# StealthBridge design system

Version 3, 2026-11-28. **Single source of truth:** [`src/app/design-system.css`](../src/app/design-system.css) `:root` tokens. Everything else resolves to them:

- Tailwind theme colours in [`globals.css`](../src/app/globals.css) `@theme` (`bg-sb-navy`, `text-sb-mint`, …) are `var(--sb-*)` references.
- [`app-light.css`](../src/app/app-light.css) is **generated** by `scripts/generate-app-light-css.py` (CI fails if stale). It maps every colour in legacy component CSS onto a canonical token by role, and introduces no colours of its own. Edit the generator or the tokens, never the output.

## Identity

One product, two surfaces that share a brand:

| Surface | Background | Accent |
|---|---|---|
| Public site | Navy brand canvas (`--sb-navy`) | Mint (`--sb-mint`), **only on navy** |
| App chrome (sidebar), balance card | Navy (`--sb-navy`) | Mint |
| App content | Neutral light canvas and white cards | Teal (`--sb-brand`), for links, active and verified states |

Type is Geist everywhere. Money uses tabular figures in the sans face; Geist Mono is reserved for addresses and hashes.

## Tokens

| Group | Tokens |
|---|---|
| Brand | `--sb-navy`, `--sb-navy-raised`, `--sb-navy-line`, `--sb-navy-text`, `--sb-navy-muted`, `--sb-mint`, `--sb-brand`, `--sb-brand-strong`, `--sb-brand-soft` |
| Surfaces | `--sb-canvas`, `--sb-surface`, `--sb-surface-2`, `--sb-surface-3`, `--sb-line`, `--sb-line-strong` |
| Text | `--sb-ink`, `--sb-ink-2`, `--sb-ink-3`, `--sb-ink-inverse` |
| Status | `--sb-success`, `--sb-warning`, `--sb-danger`, `--sb-info` (each with `-soft`) |
| Privacy | `--sb-privacy-public` (warning), `-encrypted` (info), `-protected` (brand), `-unavailable` |
| Type scale | `--sb-text-xs` 12, `-sm` 13.5, `-md` 15, `-lg` 17, `-xl` 21, `-2xl` 27 (page titles), `--sb-display` (public hero only) |
| Space | `--sb-space-1…8` = 4, 8, 12, 16, 24, 32, 48, 72 |
| Shape, depth, motion | `--sb-radius-sm/md/lg/pill` 8/12/16/999; `--sb-shadow-1/2/3`; `--sb-ease`, `--sb-duration` 180 ms; `--sb-page-max` 1080 px |

## Rules

1. **One primary action per view.** Home: Send. Business: none until there is a permitted action.
2. **Page titles are 27 px.** Display sizes are only for the public hero and section titles.
3. **No explanatory card stacks.** A page states its purpose in at most one sentence. Detail and diagnostics go in collapsed disclosures (`.sb-diagnostics`) or documentation.
4. **States are real.** Every data view has loading (skeleton), empty (one sentence plus one action), error ("Nothing was changed" plus retry) and ready states. Nothing is invented; a failed source is reported, not guessed.
5. **Privacy language follows the canonical lock.** Payments are public on Stellar. Encrypted drafts are not on-chain privacy. Both privacy rails are research only and not available.
6. **Mint never sits on a light surface.** It fails contrast. Use `--sb-brand`.

## Information architecture (app)

- **Primary navigation (sidebar and mobile tab bar):** Home, Send, Activity, Accounts.
- **Business:** a separate sidebar entry (the "More" sheet on mobile). Business tools are tabs inside it: Overview, Payments, Batch. They do not appear in the customer list.
- **Secondary (sidebar footer and the "More" sheet):** Cross-border routes, Saved drafts, Privacy, Settings.

## Primitives

`sb-page`, `sb-page-header` (eyebrow optional), `sb-card` / `sb-card-head` / `sb-card-flush`, `sb-balance`, `sb-list` / `sb-row`, `sb-badge[data-tone]`, `sb-alert[data-tone]`, `sb-btn` (`-primary`, `-secondary`, `-mint`, `-on-navy`, `-sm`), `sb-field` / `sb-input`, `sb-tabs`, `sb-empty`, `sb-skeleton`, `sb-org*` (business workspace), `sb-diagnostics`.

## Legacy bridge

Components not yet rebuilt on the primitives render inside `.sb-legacy`. That block in `design-system.css` puts them on the canonical type scale; the generator handles their colours.

Still on the bridge:
- `CustomerPaymentWorkspace` (routes and business payments), `PaymentInstructions`, `CustomerDraftVault`, `SettlementLifecyclePanel`;
- `CustomerProfileSettings`, `AccountAccessSecurity`;
- `TeamInvitations`, `OrganizationTeamWorkspace`, `BusinessBatchPlanner`.

Rebuilding one means moving it to the primitives and removing its `sb-legacy` wrapper.

## Visual review

`.evidence-work/visual/shoot.mjs` (local, not shipped) signs in through the real challenge API, serves browser-only fixtures for backend reads, and captures every public and app route at 1440×900, 1024×768, 390×844 and 360×740. It reports horizontal overflow.

## Marketing surfaces, motion and existing primitives

Carried over from the previous marketing design guide and still in force. 2.1 note: the home page no longer draws MotionPathPlugin packets; its motion is described under "Motion" above. Where it conflicts with the rules above (for example raw hex values), the token rules win for new work.

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
