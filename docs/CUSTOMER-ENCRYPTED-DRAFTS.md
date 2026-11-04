# Your encrypted draft vault (Testnet planning only)

Signed-in StealthBridge Send and Business workspaces now offer a customer-owned
way to keep unfinished transfers: encrypt and sync to the StealthBridge vault
(only once the operator has enabled the protected backend), download a private
encrypted JSON backup, unlock existing drafts, or delete the server copy.

The browser creates a new salt and IV for every backup and derives a key from
a long unique passphrase that **never leaves the tab**. Recipient, amount,
internal reference and selected corridor are encrypted together before any
network request. The server receives only an account identity, random UUID,
opaque ciphertext, version and timestamp, never the payment content or password.
The optional cloud-synchronization service is disabled by default. Offline
backup generation is available even when the backend is unavailable.

To restore: open the matching personal or business workspace, enter the same
passphrase, choose Unlock/Restore or import the encrypted backup. The form is
repopulated with an *unverified* planning draft; previous recipient evidence,
manual confirmation and any local integrity fingerprint are invalidated. The
selected corridor is looked up afresh if it is no longer in the current list.
The customer must check the recipient and rerun the full live Testnet preflight
before a new review. Financial execution always remains unavailable.

Passwords are unrecoverable. A browser tab with malicious scripts can still
access values before they are encrypted. There is no passkey-based recovery,
smart-account deployment, KYC provider, FX offer, private token transfer or
on-chain ZK proof in this feature. Customer deletion removes only StealthBridge's
ciphertext copy, not files previously saved by the customer or backups made by
other parties.

Tests: `npm run typecheck && npm run build && npm run test:browser --
tests/browser/customer-draft-vault.spec.ts` (the browser suite uses mocked
storage records; actual Neon integration must be separately verified in staging).
