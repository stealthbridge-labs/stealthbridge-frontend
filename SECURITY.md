# Security Policy — StealthBridge (frontend)

## Scope
This repository contains the Next.js web application and same-origin Backend-for-Frontend (BFF) proxy for StealthBridge. It is experimental **Stellar Testnet-only** financial user interface software and has not completed an independent third-party security audit. Real funds, production wallet seeds, unencrypted private notes, and real fiat banking secrets must never be entered into the interface.

## Responsible reporting
Do not disclose critical vulnerabilities, cross-site scripting (XSS) vectors, or session handling issues in public GitHub issues, pull requests, or discussions.

If the repository's GitHub private vulnerability reporting is enabled, please submit reports directly via **Security → Report a vulnerability**. Otherwise, contact the organization maintainers privately to coordinate confidential evaluation and patching.

Please include in your report:
- Impacted route, UI component, or API proxy handler
- Deterministic, non-destructive reproduction steps or browser environment details
- Expected vs. observed security property
- Assessment of impact (e.g., unauthorized data disclosure, CSRF, session fixation, XSS)

Do not include private keys, live network secrets, or real customer credentials.

## Frontend Security Commitments & Architectural Invariants
- **Zero Client-Side Storage of Financial Secrets:** The application strictly forbids storing customer balances, transaction histories, private payment notes, wallet seed phrases, or bearer API tokens in `localStorage`, `sessionStorage`, or `indexedDB`.
- **BFF Same-Origin & CSRF Defense:** All customer data routes (`/api/account/*`) enforce strict Same-Origin Policy (SOP), origin validation headers, HTTP-only secure cookie session identity, and outbound HMAC-SHA256 signature signing before relaying requests to the backend API.
- **Content Security & Sanitization:** Strict Content Security Policy (CSP) headers, sanitized HTML rendering, and modern Next.js App Router boundary isolation defend against injection and cross-site scripting attacks.
- **Zero Simulated or Fabricated Data:** The user interface never renders fake balances, fabricated FX exchange rates, or mock settlement confirmations. Unfunded accounts and unexecuted transfers display explicit, truthful empty and pending states.
- **Transparent Testnet Status:** The interface maintains prominent Testnet network badges, contract deployment identifiers, and explicit legal/operational disclaimers across all workflows (`mainnet_enabled: false`, `fiat_payouts_enabled: false`, `live_fx_enabled: false`).

## Important
No guarantee of financial security or transaction finality is made until formal verification, independent cryptographic audit, and mainnet governance deployment are complete. All deployments remain strictly restricted to Stellar Testnet.
