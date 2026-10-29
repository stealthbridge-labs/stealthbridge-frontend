# Business Batch Planner: independent live operational preflight

Signed-in users may paste a CSV or import a .csv file <=32 KB. The browser reads and validates it locally. File bytes, recipient addresses, invoice references and amounts are never transmitted; only up to eight public route IDs are sent to two GET-only public catalog reads.

The live batch preflight includes the exact operator records and fresh Stellar Testnet RPC and SQLx schema checks. The frontend validates its exact response, timestamp and false financial flags, then compares the entire route identity with the original catalog response. A discrepancy hides the review; a degraded schema or network remains visible as informational warning, never authorization.

There is no payout, fee quote, transfer, bank upload, stored file, signing or authorization. No source-level Soroban governance method is claimed to be deployed on network. A confirmed catalog row is not an issuer or payout eligibility assertion.
