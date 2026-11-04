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

## Editing, recovery and passphrase changes

After unlocking a saved cloud draft, the workspace shows its random draft ID
and revision. Edit the payment plan and select **Update saved encrypted draft**.
The customer must re-enter the passphrase to unlock the existing ciphertext;
StealthBridge encrypts the revised data again and sends only a new ciphertext,
the old draft ID and the exact expected revision. The backend atomically rejects
stale or competing writes (409) so another device cannot be overwritten by an
earlier browser session. A full eight-slot account can update an existing slot.

**Change draft passphrase** verifies the old ciphertext locally, requires a new
and confirmed passphrase, then re-encrypts with fresh salt, IV and a derived
key. Rotation is per draft, never global; old offline backups remain unlockable
using the previous secret and must be managed separately. Wrong old passwords
or stale revisions leave the saved ciphertext unchanged.

A downloaded JSON backup can be imported on another device after signing in
with the same classic Stellar G-account and entering the backup's passphrase.
The import restores an unsigned local form only. If the customer then chooses
**Save backup as new encrypted draft**, a fresh UUID and nonce are generated
and ciphertext saved in a distinct slot. The original backup isn't replaced;
cloud save never happens just because a file was selected.

These browser and crypto flows can be evaluated in isolation. Operator feature
flags and protected SQLx migration remain prerequisites to live cloud sync.
Neither a passphrase nor a detected WebAuthn device is a Soroban authorization.
