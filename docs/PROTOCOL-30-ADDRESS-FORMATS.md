# Stellar Protocol 30 Address Formats (Frontend)

The browser preparation, encrypted vault, local review commitment, CSV batch parser, and Testnet recipient presence flows support all four canonical Stellar StrKey formats (`G`, `M`, `C`, and CAP-84 `W`) via `src/lib/stellar-address.ts`:

- **`G...` (56 chars)**: Classic Ed25519 account. Used for Freighter SEP-53 sign-in, encrypted draft/instruction ownership, transfer senders, and Horizon classic account lookup.
- **`M...` (69 chars)**: Muxed classic account (`baseAddress` `G...` + `uint64` mux ID). Accepted as a transfer recipient; public Testnet presence checks look up the underlying `G...` account via `/api/public/classic-recipient/{address}` and explicitly disclose that mux ID routing is unverified.
- **`C...` (56 chars)**: Soroban contract ID. Accepted as a recipient and contract-instance inspection target; RPC checks confirm instance existence only.
- **`W...` (69 chars, CAP-84)**: Muxed Soroban contract (`baseAddress` `C...` + `uint64` mux ID). Accepted as a recipient and in public contract inspection (resolving to its underlying `C...` contract instance) with explicit disclosure that mux ID routing and `__check_auth` smart-account permissions remain unverified.

Non-canonical 69-char `M...`/`W...` inputs whose unused Base32 trailing bit is non-zero are rejected.
