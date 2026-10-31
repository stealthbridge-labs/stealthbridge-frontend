# StealthBridge customer product architecture

## Single application, three customer contexts

StealthBridge is a cross-border payment product, not a wallet-debugger dashboard.
The authenticated application has a stable structure:

| Product context | Route | Purpose |
| --- | --- | --- |
| Home | /app | Account entry, actual saved preferences, next actions and sign-in trust |
| Personal | /app/send | Explore a real corridor, verify a public recipient, prepare a local transfer review |
| Business | /app/business | Business onboarding, active organizational access, viewer invitations and clear entry points for planning |
| Business · single payment | /app/business/payments | One browser-local payment draft, using fresh corridor and recipient preflight |
| Business · batches | /app/business/batch | Browser-local CSV drafts; only public corridor IDs sent to the API for configuration checks |
| Business · team | /app/business/[id] | Organization-scoped membership, review and role boundaries |
| Account | /app/settings | Self-reported profile preferences, saved using a signed server-to-server account bridge |

The customer-facing header separates Home, Personal, Business, and Account.
Only one route is current at a time (aria-current=page); mobile navigation
scrolls horizontally instead of wrapping six unrelated actions into several lines.
The signed-in header has a keyboard skip link. Every authenticated route
requires a verified wallet session and stays non-indexed.

### Product separation rules

- The home dashboard never duplicates a full business management interface.
- Business registration and team membership live under Business, not under Home.
- Single-payment preparation does not appear above business onboarding.
- Business payment and CSV batch planners are separate explicit destinations.
- The public product pages describe the customer benefit without exposing internal
  governance receipts, operator addresses, SDKs or deployment tools.
- A real record is shown only after strict server response validation. Missing
  records display meaningful empty states; unavailable dependencies display an error.
- Recipient nicknames, amounts and internal references remain in the browser tab
  for preparation and are not saved by business onboarding or sent to financial APIs.

## What is functional now

Signed wallet-challenge login, real Neon account profiles, pending business
applications, active organization membership reads, optional viewer invitations,
verified Testnet public corridor metadata, local transfer drafts and batch planning.
Session identity and organization role do not authorize funding or payments.

## Conditions before a real payment pilot

1. Independently reproduce and validate the intended confidentiality mechanisms
   and bind proofs to issuer, amount, recipient and ledger state.
2. Validate smart-account signer policy, user-controlled recovery, TTL handling,
   adversarial authorization and replay tests; the read-only preflight is not deployment.
3. Verify issuer agreements, real supported assets, liquidity, FX/fees, compliance
   eligibility, bank/payout partners, disputes and ledger reconciliation.
4. Isolate and approve production schema changes, monitoring, incident response,
   customer support and operational access before enabling any write path.
5. Ship a narrowly scoped Testnet financial execution pilot only after explicit
   release authorization. No mainnet move or customer funds by implication.

### Acceptance

Frontend unit, keyboard, desktop/mobile browser and production smoke should cover
Home -> Personal draft, Home -> Business -> onboard -> organization access,
and Business -> single/batch planning. Every financial execution control remains
disabled; read-only production smoke creates no customer records.


### Public corridor deep links

The public route explorer sends a validated public UUID to the dedicated
business single-payment page via the signed-in redirect whitelist. Existing
links to /app/business?corridor=<uuid> redirect server-side to the new page
only when the query contains that single valid UUID. Amounts, recipients
and private references are neither accepted nor forwarded.
