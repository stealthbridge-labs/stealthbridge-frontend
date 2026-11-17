/** Public WASM identities mirrored from contracts/tools/smart-account-preflight/src/manifest.mjs.
 * Upstream stellar/smart-account-kit 0.10.0, commit 768ac041dad01b94a750b768fc650e67930afd28.
 * These public pins convey no customer deployment or financial authorization.
 */
const ACCOUNT="c514d35ea67eaea9bfc1fb3327854c0c06111bc1ddebd4fe217c504c1004b9e1";
const WEBAUTHN="e63a030d0f1a1481e36059a4837c433083b33e704c1f9625b7314795b6d72b76";
const THRESHOLD="f72a11de6e2d5d2495d98fe61e04cd13544e64156a5a3be83ef8c2e403d14a94";
const SPENDING_LIMIT="9bc17db0a804d6c82231a268c43bac1413650ea92cac0022e0d0a3b66ddc8189";
export const SMART_ACCOUNT_PINS=[
 ["account_code","code",ACCOUNT],
 ["webauthn_instance","instance",WEBAUTHN],
 ["webauthn_code","code",WEBAUTHN],
 ["threshold_instance","instance",THRESHOLD],
 ["threshold_code","code",THRESHOLD],
 ["spendingLimit_instance","instance",SPENDING_LIMIT],
 ["spendingLimit_code","code",SPENDING_LIMIT]
] as const;
