# StealthBridge Marketing Design System

**Thesis:** Move value. Not exposure. Express a world of connected opportunities through subtle, directional light, protected routes, translucent architectural objects and substantial editorial typography. Product sites must never route a public visitor to a codebase, engineering issues or source roadmaps.

## Brand

Keep the approved StealthBridge cyan/teal ribbon icon in `public/brand/`. Navy `#031419`, surface `#092129`, mint `#80F6DB`, sky `#80B9FF`, primary type `#EAF9F6` and secondary text `#99B7B8`. Large heads, small uppercase editorial labels, narrow readable prose, generous white space and transparent limitations.

## Public surfaces

`/`: positioning + living schematic, selectable product cards, responsible privacy principles.

`/business`: institutional settlement, confidentiality, organizational oversight, reconciliation.

`/send`: consumer-first remittances, responsible privacy choices and delivery clarity.

`/platform`: modular platform philosophy, privacy model differences, blockchain/off-chain distinction.

All pages are information products at this stage. No fabricated corridor, provider name, FX quote, transaction hash, fund success state, or performance statistics.

## Motion language

- **GSAP entrance**: header + headline reveal through motion and blur, settling into a stable readable position.
- **GSAP MotionPathPlugin**: soft packets travel across the conceptual settlement board following its curved routes. They represent *connection*, not transfer completion.
- **GSAP ScrollTrigger**: perspective chapters and value cards rise into place when scrolled into view.
- **GSAP ambient**: orbital glow, barely floating board, softened breathing highlights.
- **Interactive**: Business/Send selector crossfades and subtle hover/tactile responses.
- **CSS**: restrained moving aurora headline, rotating arcs and light sweep on primary CTA.

Respect `prefers-reduced-motion: reduce`: disable looping and entrance animation in JavaScript and CSS, never use visibility:hidden as a static starting state and leave all content readable. No motion should claim on-chain finality or actual fiat payout.

## Accessibility & responsive quality

Keyboard-visible focus, aria-expanded mobile navigation, semantic anchors for product exploration, meaningful screen reader labels, legible dark/light contrast, no hover-only content, flexible product cards on mobile, high-contrast error/availability text. Audit with real browser screenshots and screen reader; do not infer conformance from code alone.

## Interaction primitives and navigation

Use `Button` (`src/components/ui/button.tsx`) for consistently styled action links and button controls. The primary mint button identifies one meaningful CTA per section; outline/secondary styles show alternatives; glass is reserved for surfaces over artwork; danger should be reserved for truly destructive, future authorized actions. Buttons have visible focus rings, accessible 44–48px targets on mobile, deterministic disabled states and reduced-motion fallbacks. `asChild` must wrap one real link, not a nested button.

`SiteEnhancements` adds a passive scroll-progress indicator and a visible, keyboard-operable Back to Top button after meaningful scroll depth. These are navigation aids only, not financial-state indicators.

## Primary CTA color regression (2026-10)

The mint CTA must use a **dark ink label and icon**, never inherited white text. Root cause: an unlayered global `a { color: inherit }` style out-ranked Tailwind's layered `text-*` utilities on anchor-as-button controls. The global anchor reset now lives inside `@layer base`, and explicit `data-variant` selectors reinforce every Button variant.

The automated browser test `tests/browser/button-contrast.spec.ts` reads computed CSS colors and checks at least 4.5:1 for primary mint buttons across the homepage and three product pages. Keep icon strokes bound to `currentColor`, avoid hover contrast regressions, and test tablet/mobile sizes. Marketing link buttons should have readable 14–15px labels and approximately 52–56px touch heights.

## GSAP lifecycle and visual-evidence regression gate

The Playwright `motion-regression.spec.ts` exercises **all four public routes** in normal-motion desktop/mobile and reduced-motion Chromium. It captures full-page screenshots and route recordings under the CI artifact `marketing-motion-evidence`, without accessing private workspaces, wallets or accounts. The browser additionally asserts reduced-motion text remains fully visible, no JS runtime errors appear and repeated client-side product navigation does not accumulate ScrollTrigger instances. The inert DOM attribute `data-stealthbridge-gsap-triggers` reports only a count of GSAP triggers for leak detection; it contains no user or payment data and is cleared when each context reverts.

Each GSAP context is created inside a React effect and reverted on unmount. The CSS `prefers-reduced-motion: reduce` cascade suppresses ambient/transient motion and the React effects never start looping GSAP animations in reduced mode. Review desktop/mobile screenshots and videos for actual visual quality; a passing automated test does not replace a screen-reader or device audit. All routing illustrations describe **conceptual** movement, never settled transfers.
