# Customer-facing corridor discovery (public Testnet catalog)

## User journey

The public `/routes` page is reachable from both product stories without signing in, connecting a wallet, or disclosing a recipient. Its controls accept two-letter uppercase ISO-style country codes and one of the two declared research technologies.

Submitting the form updates shareable URL parameters and triggers a server-filtered GET to `/api/public/corridors`. The Next.js proxy checks every query key, rejects repeated or invalid values and forwards only the allowlisted parameters to Rust's existing `/v1/corridors/page` query. The Rust service applies parameterized PostgreSQL filters against operator-enabled corridor records.

Requests are uncached; clients validate the exact response shape and route identities. At most 25 records are returned in one page, with an explicit `next_cursor`. The UI never presents a partial page as the full catalog. Retries, cancellation, backend unavailability, duplicate rows across pages and invalid user links receive explicit, accessible handling. No business name, customer identity, wallet address or payment details are sent.

## Availability is not eligibility

A corridor record is public operator metadata, **not** a legal or regulatory service availability decision. There is no exchange-rate quote, fee breakdown, liquidity proof, verified cryptographic confidentiality, fiat partner, bank payout or settlement execution on this page.

When the API returns an empty page, the UI shows the exact absence of matching configured records; it does not infer that the geographic corridor does not exist elsewhere. When the API is unavailable or sends an unexpected shape, the UI shows an error and **never** substitutes fake records. When data is retrieved, the client labels the check time but does not claim it is a live ledger observation.

## Engineering and acceptance

- API is GET only, `no-store`, fixed HTTPS backend allowlist, bounded JSON response, and no user-supplied destination URL.
- Server-side PostgreSQL filtering is already present in the Rust backend. This change requires no database migration and introduces no financial endpoint.
- Node tests cover malicious filters, cursors, response validation, no extra pricing fields and the exact query the browser issues.
- Playwright tests cover empty, populated, paginated, server error, and mobile overflow without wallet permissions or payment submission.
- Stellar Testnet remains the only environment. Live pricing, destination validation, regulated partner activation, and actual private settlement each require separate evidence and release controls.
