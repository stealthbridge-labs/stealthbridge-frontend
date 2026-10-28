# Enterprise batch planner (currently draft-only)

The signed-in /app/business/batch page offers browser-memory-only CSV draft review. It accepts up to 50 rows, eight distinct configured public corridor UUIDs, canonical Stellar classic G-addresses, conservative decimal draft amounts and unique safe references. It accepts no recipient names, bank account fields, or personal notes.

The only outbound read is GET /api/public/corridors/batch?ids=<comma-separated public UUIDs>, which has a byte-bounded, GET-only trusted Vercel backend proxy. Client and SDK validators require an exact response shape with false financial flags; no fabricated corridor, provider, rate, liquidity or payment record is tolerated. Client previews mask recipient addresses; full recipient text remains only in the user's textarea state, which is cleared on explicit reset and on navigation.

A configured catalog record means **only** that the operator has enabled public corridor metadata. It is not a quote, supplier/issuer validation, financial authorization, compliance approval, privacy verification, sufficient ledger freshness, custody proof or payment availability. No sign, transfer, balance, payout or order endpoints are called. Amount scale is a browser draft limit, not verified asset decimal precision.

Production database SQLx migrations remain subject to the separately reviewed release gate. Do not enable execution based on this planner's counts.
