"use client";
/**
 * Stellar wallet connection through Stellar Wallets Kit (creit-tech, JSR
 * @creit-tech/stellar-wallets-kit 2.8.0): one modal for Freighter (Varial),
 * xBull, Albedo, LOBSTR, Rabet, Hana, Klever, OneKey, Bitget, Fordefi,
 * CactusLink, D'CENT, Scopuly and Ghostsig.
 *
 * The list is explicit rather than defaultModules(): MetaMask's
 * @metamask/connect-stellar 0.3.0 imports the kit's old npm name
 * (@creit.tech/stellar-wallets-kit) without declaring it, which no bundler can
 * resolve. Add MetaMask Snap back once upstream fixes that import.
 *
 * Proving control of the account for sign-in:
 * 1. SEP-53 message signing when the wallet supports it;
 * 2. otherwise a SEP-10 style challenge transaction (sequence 0, so it can never
 *    execute), which every transaction-signing wallet supports.
 * The kit is imported lazily so it never ships with pages that don't connect.
 */
export const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

type Kit = typeof import("@creit-tech/stellar-wallets-kit/sdk").StellarWalletsKit;
let kitPromise: Promise<Kit> | null = null;

/** Brand colours for the kit's modal (light product surfaces). */
const THEME = {
  background: "#ffffff",
  "background-secondary": "#f4f6f5",
  "foreground-strong": "#0a1a1f",
  foreground: "#0a1a1f",
  "foreground-secondary": "#3a5055",
  primary: "#0b7a66",
  "primary-foreground": "#ffffff",
  transparent: "rgba(0,0,0,0)",
  lighter: "#f8faf9",
  light: "#eff3f2",
  "light-gray": "#dfe6e4",
  gray: "#66797d",
  danger: "#b3261e",
  border: "#dfe6e4",
  shadow: "0 24px 60px -24px rgba(10,26,31,.35)",
  "border-radius": "16px",
  "font-family": "var(--font-geist-sans), Inter, system-ui, sans-serif",
};

async function kit(): Promise<Kit> {
  kitPromise ??= (async () => {
    const [{ StellarWalletsKit }, { Networks }, ...m] = await Promise.all([
      import("@creit-tech/stellar-wallets-kit/sdk"),
      import("@creit-tech/stellar-wallets-kit/types"),
      import("@creit-tech/stellar-wallets-kit/modules/varial"),
      import("@creit-tech/stellar-wallets-kit/modules/xbull"),
      import("@creit-tech/stellar-wallets-kit/modules/lobstr"),
      import("@creit-tech/stellar-wallets-kit/modules/albedo"),
      import("@creit-tech/stellar-wallets-kit/modules/rabet"),
      import("@creit-tech/stellar-wallets-kit/modules/hana"),
      import("@creit-tech/stellar-wallets-kit/modules/klever"),
      import("@creit-tech/stellar-wallets-kit/modules/onekey"),
      import("@creit-tech/stellar-wallets-kit/modules/bitget"),
      import("@creit-tech/stellar-wallets-kit/modules/fordefi"),
      import("@creit-tech/stellar-wallets-kit/modules/cactuslink"),
      import("@creit-tech/stellar-wallets-kit/modules/dcent"),
      import("@creit-tech/stellar-wallets-kit/modules/scopuly"),
      import("@creit-tech/stellar-wallets-kit/modules/ghostsig"),
    ]);
    const [varial, xbull, lobstr, albedo, rabet, hana, klever, onekey, bitget, fordefi, cactus, dcent, scopuly, ghostsig] = m;
    StellarWalletsKit.init({
      modules: [
        new varial.VarialModule(), new xbull.xBullModule(), new lobstr.LobstrModule(), new albedo.AlbedoModule(),
        new rabet.RabetModule(), new hana.HanaModule(), new klever.KleverModule(), new onekey.OneKeyModule(),
        new bitget.BitgetModule(), new fordefi.FordefiModule(), new cactus.CactusLinkModule(), new dcent.DcentModule(),
        new scopuly.ScopulyModule(), new ghostsig.GhostsigModule(),
      ],
      network: Networks.TESTNET,
      theme: THEME,
      authModal: { showInstallLabel: true, hideUnsupportedWallets: false },
    });
    return StellarWalletsKit;
  })();
  return kitPromise;
}

export type WalletError = { code: "CANCELLED" | "UNSUPPORTED" | "WRONG_NETWORK" | "WRONG_ACCOUNT" | "FAILED"; message: string };

function walletError(e: unknown, fallback: string): WalletError {
  const raw = e && typeof e === "object" ? (e as { code?: unknown; message?: unknown }) : {};
  const message = typeof raw.message === "string" ? raw.message : fallback;
  if (raw.code === -1 || /closed the modal|reject|denied|declined|cancel/i.test(message)) return { code: "CANCELLED", message: "Cancelled in your wallet." };
  if (raw.code === -3 || /not support/i.test(message)) return { code: "UNSUPPORTED", message };
  return { code: "FAILED", message };
}

/** Opens the wallet picker and returns the chosen account address and wallet name. */
export async function connectStellarWallet(): Promise<{ address: string; wallet: string }> {
  const k = await kit();
  try {
    const { address } = await k.authModal();
    let wallet = "your wallet";
    try { wallet = k.selectedModule.productName; } catch { /* name is cosmetic */ }
    return { address, wallet };
  } catch (e) {
    throw walletError(e, "Couldn't connect to the wallet.");
  }
}

/** The wallet's network, when it reports one. Wallets that can't say return null. */
export async function walletNetwork(): Promise<string | null> {
  const k = await kit();
  try { return (await k.getNetwork()).networkPassphrase; } catch { return null; }
}

export type ControlProof = { signature: string } | { signed_transaction: string };

/**
 * Proves control of `address` for a sign-in challenge: SEP-53 message first,
 * SEP-10 style challenge transaction when the wallet can't sign messages.
 */
export async function proveAccountControl(
  address: string,
  challenge: { message: string; transaction: string },
  onStep?: (step: string) => void,
): Promise<ControlProof> {
  const k = await kit();
  try {
    onStep?.("Approve the sign-in message in your wallet");
    const signed = await k.signMessage(challenge.message, { address, networkPassphrase: TESTNET_PASSPHRASE });
    if (signed.signerAddress && signed.signerAddress !== address) throw { code: "WRONG_ACCOUNT" };
    if (typeof signed.signedMessage === "string" && signed.signedMessage) return { signature: signed.signedMessage };
    throw { code: -3, message: "No message signature returned" };
  } catch (e) {
    if ((e as { code?: unknown })?.code === "WRONG_ACCOUNT") {
      throw { code: "WRONG_ACCOUNT", message: "The wallet signed with a different account." } satisfies WalletError;
    }
    const err = walletError(e, "The wallet couldn't sign the sign-in message.");
    if (err.code === "CANCELLED") throw err;
    // Message signing unsupported or failed: use the transaction challenge.
  }
  try {
    onStep?.("Approve the sign-in request in your wallet (it can't move funds)");
    const { signedTxXdr } = await k.signTransaction(challenge.transaction, { address, networkPassphrase: TESTNET_PASSPHRASE });
    if (typeof signedTxXdr !== "string" || !signedTxXdr) throw { message: "No signed transaction returned" };
    return { signed_transaction: signedTxXdr };
  } catch (e) {
    throw walletError(e, "The wallet couldn't sign the sign-in request.");
  }
}

export async function disconnectStellarWallet(): Promise<void> {
  if (!kitPromise) return;
  try { await (await kit()).disconnect(); } catch { /* already disconnected */ }
}
