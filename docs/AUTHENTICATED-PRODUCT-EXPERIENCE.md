# StealthBridge product and authenticated-account architecture

StealthBridge is a cross-border financial product—not simply a wallet dApp.
Public visitors must first understand its use cases, trust boundaries,
personal and institutional journeys, privacy limitations, and rollout status.

## Public product discovery

- `/`: brand, audience, platform vision, responsible public claims.
- `/send`: personal remittance product narrative, accessibility, privacy
  properties and limitations, delivery stages, FAQs, and sign-in CTA.
- `/business`: settlement and treasury value proposition, confidentiality,
  approval responsibilities, reconciliation and disclosure, FAQs, sign-in CTA.
- `/platform`: technical foundation translated into human outcomes.
- `/discover/send` and `/discover/business`: legacy narrative paths, no
  customer wallet connection or financial data collection.
- `/login`: separate account access, reached intentionally after exploring
  the product. No account address is needed to browse public pages.

The above routes must not silently prompt for wallet permissions, require a
wallet connection, claim active remittance payouts or display developer
infrastructure as if it were the primary customer journey.

## Authenticated product

- `/app`: server-guarded account overview and entry to distinct personal
  and organizational use cases.
- `/app/send` and `/app/business`: actual Testnet corridor metadata, local
  preparation and review, and the documented transfer safety gate.
- Account sign-out uses `POST /api/auth/logout`. Server authorization
  checks occur before rendering the protected page, not only in a client
  component.
- Unknown session or an expired signed cookie redirects to `/login`.
- The signed-in G-address is not a customer profile, proof of legal identity,
  bank account, organization role or payment authority.

### What "sign in with Freighter" means

A visitor intentionally approves their public Testnet account in Freighter;
the browser confirms the exact Testnet network. The server issues a nonce
and a five-minute, signed challenge naming the current origin, account,
network passphrase, purpose and expiration. The wallet signs the text using
SEP-53. The server verifies the Ed25519 signature, compares the signer to
the public G-address, checks that the challenge is fresh, HMAC-valid,
origin-bound and stored in a secure HttpOnly SameSite cookie, and then
issues a separate signed, HttpOnly, two-hour read-only account session.

Freighter connection **alone** is not authentication. Requesting a
`G...` public address, watching another account, uploading an address,
or observing an on-chain contract does not open `/app`. No transaction XDR,
seed phrase, signing key, asset amount or transfer request is sent through
the login endpoint.

Production and preview require independent, randomly generated secrets
under `STEALTHBRIDGE_WEB_SESSION_SECRET` in server-side **sensitive** Vercel
environment settings. The app fails closed if absent. Never prefix this
environment variable with `NEXT_PUBLIC_` or commit secret values. The
host/origin comparison rejects cross-origin POSTs. Cookies use HTTPS Secure
in production and session endpoints return `Cache-Control: no-store`.
Authorization occurs server-side on every protected page request.

### Important release boundaries

The short-lived cookie authenticates possession of a Stellar signing key
for **read-only account navigation**; it does not create a complete consumer
identity, persistent user profile, trusted device credential, regulatory
onboarding, business membership or settlement authorization. Stateful
server-side session revocation, account recovery and organization rights
require additional verified infrastructure before financial operations.

Passkey/Soroban smart-account login is currently **not enabled**. It must
not be implied by device authenticator availability or contract presence.
Build and independently review a tested smart-account factory, challenge
verification, key rotation, recovery and role policies before adding that
method. Further authentication surfaces (email/social/business SSO)
require separate verified providers, consent, privacy and account-linking.

The Rust backend remains the source of real Testnet network, corridor and
governance observations. Financial settlement, fee collection, confidential
private-payment claims and fiat payouts remain disabled until independently
verified across contracts, backend, SDK and the product.

## Future stages

1. Persist scoped account profiles and consent, with real session revocation,
   optional authenticator/recovery and support for non-wallet users.
2. Implement organization onboarding, identity/risk verification,
   invitations, roles, sign-off policy and authenticated tenant APIs.
3. Connect verified partners, funding and recipient compatibility to real
   quotes and guarded settlement and payout orchestration.
4. Integrate independently reproducible confidential-token and private
   relationship-transfer primitives; prove recovery, ledger finality, fee
   claims and compliance boundaries before enabling any write action.
5. Ship accessible customer service, notifications, transfer history,
   disputes, multi-device security and status supported by actual provider
   evidence rather than simulated records.

## Actual organization access from the signed-in account

The account overview fetches `GET /api/account/directory` only after
server-side wallet-session authentication. Next.js signs a 30-second
server-to-server attestation for the current G-address and calls
`GET /v1/account/directory` on the Rust backend. The shared bridge key is
a sensitive `STEALTHBRIDGE_ACCOUNT_BRIDGE_SECRET` set independently in
Vercel production and preview for both projects. It is not an SDK key,
wallet key, browser cookie, or customer identity provider.

Rust queries actual Neon `organizations` and `organization_members` rows
while excluding revoked members and suspended tenants. The Next.js BFF
validates the exact schema, logged-in address, valid role names and immutable
`false` financial authorization before returning data. Public pages do not
call this endpoint. A missing organization yields a truthful empty state;
an unavailable database, missing backend bridge configuration, bad signature
or corrupted response yields an explicit unavailable state, not a fabricated
company or successful onboarding.

This is a **membership directory**, not the future persistent customer
profile/organization enrollment product. A G-address proves control of
a Stellar signing key, not identity, regulated business legitimacy, bank
balance, organization signing policy or permission to pay.
No organization is automatically created at sign-in. There are no
customer-initiated permission changes, new settlement writes or fee claims.
