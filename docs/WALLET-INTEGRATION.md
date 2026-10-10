# Wallet integration: Freighter and watch-only public accounts

StealthBridge uses two deliberately separate **read-only** wallet flows in
engineering previews (`/preview/business` and `/preview/send`).

## Connect Freighter

A user clicks **Connect Freighter**, permitting the Freighter extension to
return its currently selected public account address. The UI checks the
canonical Stellar `G...` StrKey checksum and the exact Stellar **Testnet**
passphrase. It cross-references the backend's independently reported Testnet
passphrase and rechecks wallet/account/network changes when the page regains
focus. A mismatch invalidates local connection status.

- No background auto-connect or permission prompts.
- No seed phrase, raw secret, recovery material, signed message or
  transaction is requested.
- No wallet/account address is submitted to the StealthBridge API.
- **Forget connection** clears the website's current in-memory account
  state. It does not revoke Freighter's extension-level permissions; the
  user can revoke them in Freighter.
- A connected account proves only the extension has permitted the page to
  read a public key; it **does not prove a signed challenge** or grant
  organization, settlement, or custody authorization.

## Watch a public address

The user can paste a public Stellar **G-address** into the watch-only input.
The code validates the 35-byte StrKey representation: network version byte
and little-endian CRC16-XModem checksum. No RPC request, wallet extension,
analytics event or server-side storage is involved. The account is shown
explicitly as **watch-only, not connected**.

Support for M-address multiplexed accounts or C-address Soroban contracts
would require separate type-aware data handling. These must not be silently
accepted as classic wallet accounts.

The initial watch-only function deliberately **does not fetch balances or
historical transactions** because doing so would transmit the entered
address to a remote service. A future opt-in public-chain lookup may be
offered after the user consents to the privacy implications.

## Soroban transaction signing: future release gate

The backend's canonical contract discovery manifest currently says
`not-deployed` and `on_chain_verified=false`. A deployed registry is not a
confidential transfer or fiat payout contract. Before any signing UI may
appear, the application must verify deployed contract IDs, ABI/WASM digests,
network passphrase, allowed methods and the exact transaction authorization
footprint.

Once independently audited and approved, a wallet signing action must be
initiated by a **distinct, explicit transaction confirmation**, with
simulation, human-readable consequences, trustable balance/fee limits and
the connected account reverified immediately before signing. Never
translate a "Connect" or "Watch" button into a Soroban invocation.

## Test coverage

The Playwright technical-preview suite verifies checksum failures,
watch-only local behavior, lack of wallet-connection claims, disabled
transfers and the absence of POST requests. These are mock-API UI tests,
not demonstrations of deployment, wallet signatures or private payments.
