# Freighter wallet Testnet safety acceptance (no signing)

The technical preview supports **public-account connection and watch-only viewing only**. It cannot generate, sign, submit or broadcast transactions, and it must not request mnemonic/private keys. No wallet identity is sent to StealthBridge servers by the connection component.

## Passive, permission-safe restoration

On first mount, call `isConnected()` to detect the installed extension, then `isAllowed()` to check prior Freighter authorization. Call `getAddress()` and `getNetwork()` **only if authorization already exists**. No `requestAccess()` call is allowed until a human presses **Connect Freighter**. Reject invalid public account StrKeys and any passphrase other than exact `Test SDF Network ; September 2015`. A connected wallet without an independently verified fresh backend Testnet observation is **never** a payment-ready wallet.

When the tab regains focus or becomes visible, recheck installed status, allowlist, account and network; immediately discard a revoked or changed wallet identity. Generation counters also invalidate delayed focus/visibility rechecks after **Forget connection** or newer manual checks. After `requestAccess()`, the component independently re-reads allowlist, public account and network before declaring a local session, rejecting account, permission or network changes during the prompt; no response is allowed to resurrect a connection after a tab-local disconnect. A page restart does not store the address in browser localStorage or send it to the API.

## Browser regression fixtures

The Next.js preview Playwright suite injects a local **mock of the Freighter extension message protocol**; this is explicitly not a real wallet or chain transaction. It verifies no permission prompt on authorized restoration, revoked permission, wrong Testnet passphrase, user denial, manual approval account/network/allowlist race conditions, no `SUBMIT_TRANSACTION` or `SUBMIT_AUTH_ENTRY` calls, and permanently disabled transfer controls. The mock contains only synthetic public addresses.

## Required manual acceptance before closing frontend issue #2

1. Install the actual Freighter browser extension from its official source and select Stellar Testnet. Use a test-only G-account, never a real-money key.
2. Visit a dedicated protected StealthBridge technical-preview deployment with read-only API configuration. Test once without authorization: no permission dialog should appear on page load.
3. Deliberately press **Connect Freighter**, grant permission, then reload. The public address should restore **without another prompt**.
4. Switch the extension to Public network, switch accounts, revoke the site allowlist and lock the extension; tab focus/reload should show a clear error and forget the prior address. Verify “Forget connection” stays forgotten.
5. Test an actual denied permission dialog, extension uninstalled and stale/RPC-down backend. No payment CTA, signing request or transaction submission should appear.
6. Inspect browser network traffic and accessibility tree on desktop/mobile: no private data, no POST transfer route, no console account secret, no inaccessible error.
7. Record the tested Freighter version, browser/version, protected staging URL, exact Testnet passphrase, screenshots and reviewer identity. **Do not paste account keys or tokens.**

**Official extension API:** [Freighter connection/authorization docs](https://github.com/stellar/freighter-developer-docs/blob/main/extension/connecting.md), `isConnected` detects installation, `isAllowed` checks prior dapp allowlisting, and `requestAccess` is the interactive permission path.

This checklist is not a claim that a real extension test has already been completed; fixture green CI alone cannot close that acceptance requirement.
