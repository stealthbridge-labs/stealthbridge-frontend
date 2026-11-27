"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, Fingerprint, Loader2, LockKeyhole, ShieldCheck, Wallet } from "lucide-react";
import { canonicalStellarAccountAddress } from "@/lib/stellar-address";
import { validAccountDestination, type AccountDestination } from "@/lib/account-destination";
import { TESTNET_PASSPHRASE, connectStellarWallet, proveAccountControl, walletNetwork, type WalletError } from "@/lib/stellar-wallets";

/** A sample of the wallets the picker offers (shown for orientation; the picker is authoritative). */
const WALLETS = ["Freighter (Varial)", "xBull", "LOBSTR", "Albedo", "Rabet", "Hana", "Klever", "OneKey", "Bitget", "Fordefi", "D'CENT"];

export function WalletSignIn({ destination }: { destination: AccountDestination }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");

  async function login() {
    setPending(true);
    setError("");
    setStep("Choose your wallet");
    try {
      const { address: raw, wallet } = await connectStellarWallet();
      const address = canonicalStellarAccountAddress(raw);
      if (!address) throw Error("Sign in with a regular Stellar account (G…). Contract and muxed addresses can't sign in.");
      const network = await walletNetwork();
      if (network && network !== TESTNET_PASSPHRASE) throw Error(`Switch ${wallet} to Stellar Testnet, then try again.`);
      setStep("Preparing a secure sign-in request");
      const challengeResponse = await fetch("/api/auth/challenge", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ address }),
      });
      if (!challengeResponse.ok) {
        if (challengeResponse.status === 503) throw Error("Secure sign-in is not configured on this deployment yet.");
        throw Error("Unable to request a secure sign-in challenge.");
      }
      const challenge: unknown = await challengeResponse.json();
      const c = challenge as { message?: unknown; transaction?: unknown };
      if (typeof c?.message !== "string" || typeof c?.transaction !== "string") throw Error("An invalid sign-in challenge was returned.");
      // Proves control of the account only: no payment, transfer or executable transaction is requested.
      const proof = await proveAccountControl(address, { message: c.message, transaction: c.transaction }, setStep);
      setStep("Verifying your signature");
      const verified = await fetch("/api/auth/verify", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "content-type": "application/json" }, body: JSON.stringify({ address, ...proof }),
      });
      if (!verified.ok) throw Error("The sign-in proof could not be verified. Please try again.");
      if (!validAccountDestination(destination)) throw Error("Unsafe destination rejected.");
      setStep("Signed in");
      router.replace(destination);
      router.refresh();
    } catch (e) {
      const w = e as Partial<WalletError> & { message?: string };
      setError(w?.code === "CANCELLED" ? "Sign-in was cancelled in your wallet. Nothing was signed." : e instanceof Error ? e.message : w?.message ?? "Unable to complete sign-in.");
      setStep("");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="sb-card sb-signin" aria-label="Sign in methods">
      <div className="sb-card-row" style={{ alignItems: "center" }}>
        <span className="sb-row-icon" style={{ background: "var(--sb-brand-soft)", color: "var(--sb-brand)" }}><Wallet size={19} aria-hidden /></span>
        <span className="sb-badge" data-tone="success">Available on Testnet</span>
      </div>
      <h2 className="sb-section-title" style={{ marginTop: 18, fontSize: 22 }}>Sign in with your Stellar wallet</h2>
      <p className="sb-muted" style={{ marginTop: 6 }}>
        Pick any Stellar wallet. You&apos;ll approve one sign-in request that proves you control your account. It can&apos;t move funds or make a payment.
      </p>
      <button type="button" className="sb-btn sb-btn-primary sb-btn-lg sb-btn-block" style={{ marginTop: 22 }} disabled={pending} onClick={() => void login()}>
        {pending ? <Loader2 size={17} className="sb-spin" aria-hidden /> : <Wallet size={17} aria-hidden />}
        {pending ? "Signing you in…" : "Connect a Stellar wallet"}
        {!pending ? <ArrowRight size={16} aria-hidden /> : null}
      </button>
      {step ? <p role="status" className="sb-subtle" style={{ marginTop: 12 }}>{step}…</p> : null}
      {error ? <div role="alert" className="sb-alert access-error" data-tone="danger" style={{ marginTop: 14 }}>{error}</div> : null}
      <ul className="sb-wallet-chips" aria-label="Supported wallets">
        {WALLETS.map((w) => <li key={w}>{w}</li>)}
      </ul>
      <ul className="sb-checklist" style={{ marginTop: 22 }}>
        <li data-state="done"><CircleCheck size={16} aria-hidden /><span><strong>Message or challenge signature</strong>Wallets that can&apos;t sign messages approve a sign-in request that is invalid on the network by design.</span></li>
        <li data-state="done"><ShieldCheck size={16} aria-hidden /><span><strong>Your keys stay in your wallet</strong>StealthBridge never sees a secret key or seed phrase.</span></li>
      </ul>
      <div className="sb-alert" style={{ marginTop: 20 }}>
        <Fingerprint size={16} aria-hidden />
        <span><strong>Passkey sign-in</strong> is in development. After you sign in, you can already create a passkey smart account for payments.</span>
      </div>
      <p className="sb-subtle" style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "flex-start" }}>
        <LockKeyhole size={14} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
        Stellar Testnet only. Signing in doesn&apos;t create a bank account, custody relationship or payment authorization.
      </p>
      <p className="sb-subtle" style={{ marginTop: 10 }}>
        New to StealthBridge? <Link className="sb-link" href="/send">Explore personal transfers</Link> or <Link className="sb-link" href="/business">see the business product</Link>.
      </p>
    </section>
  );
}
