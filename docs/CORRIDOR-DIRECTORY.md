# Public metadata corridor discovery — technical preview only

The isolated `/preview/corridors` directory lists **only enabled operator-configured rows** returned from the real backend PostgreSQL catalog. It does not populate empty results with fictitious countries, quotes, partner logos, provider coverage, or payout availability. The route is unavailable on marketing deployments.

## Filter and pagination contract

The directory uses `GET /api/bridge/v1/corridors/page?limit=25` via the Next.js same-origin GET-only proxy. Users can filter by uppercase two-letter `origin_country`, `destination_country`, and the declared `privacy_rail`. Applied filters are reflected in a shareable query string; page reload restores them after hydration, and Clear removes the query. Duplicate/unknown query parameters and invalid country/rail values are rejected at the browser control boundary. No query value is interpreted as a recipient, transfer authorization or verified asset.

Keyset continuation uses the backend's validated `next_cursor` (UUID) and the next page is appended only when the server returns a well-formed, sorted page. A PostgreSQL 503 produces a visible error; empty 200 is not called an outage. All public asset and issuer string fields are bounded and wrapped on mobile so their complete identity remains inspectable.

## Asset identity versus provider eligibility

`asset_code` and nullable `asset_issuer` are operator-supplied on-chain *identifiers*; an issuer string is **not independently verified** by this catalog. The backend has no verified fiat provider field, so every record explicitly displays **Fiat payout provider: not configured or verified**. A corridor record is not a quote, a licensed payout route, an assertion of funds, a private proof, or a valid settlement.

## Acceptance

The CI preview-browser fixtures cover empty result, HTTP failure, filtered keyset pagination, malicious filter mismatch, 64-character asset codes, 128-character issuer identities, deep-link restoration and duplicate query rejection. Existing browser tests verify disabled transfer controls. Real staging DB records still need operational verification before users can interpret catalog data as actual configured routes. No signing or money movement is introduced.
