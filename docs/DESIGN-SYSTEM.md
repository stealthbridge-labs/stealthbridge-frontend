# StealthBridge design system

Source: [`src/app/design-system.css`](../src/app/design-system.css). Version 1, 2026-11-24.

## Brand (unchanged)

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
| `/app/accounts` Smart accounts | ✅ | Real passkey creation; chain-backed status; security checklist; privacy facts |
| `/app` Overview | 🔶 | Should surface smart-account and security state |
| `/app/send` Transfers | 🔶 | Needs a privacy review step and transaction receipts once execution exists |
| `/app/instructions` | 🔶 | Encrypted drafts; flag-gated in production |
| `/app/settings` | 🔶 | Merge into a privacy & security centre with `/app/accounts` |
| `/app/business`, `/[id]`, `/payments`, `/batch` | 🔶 | Organizations stay pending until operator activation exists |
| `/`, `/send`, `/business`, `/platform`, `/routes`, `/discover/*` | 🔶 | Marketing; restyle onto tokens; no invented metrics |
| `/login` | 🔶 | Add passkey sign-in once smart-account auth exists |
| `/preview/*`, `/explorer`, `/wallet` | ⛔ | Developer and operator surfaces; to become the developer portal and operator workspace |
