"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CircleCheck, CircleDashed, CircleMinus, ExternalLink, Fingerprint, KeyRound, Loader2 } from "lucide-react";
import {
  createPasskey,
  listDeployments,
  passkeysSupported,
  requestDeployment,
  type DeploymentDirectory,
  type SmartAccountDeployment,
  validLabel,
} from "@/lib/smart-account-deployments";

const EXPLORER = "https://stellar.expert/explorer/testnet";

function short(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
}

function StatusBadge({ status }: { status: SmartAccountDeployment["status"] }) {
  if (status === "deployed") return <span className="sb-badge" data-tone="success">Active on Testnet</span>;
  if (status === "submitted") return <span className="sb-badge" data-tone="warning">Confirming on Stellar</span>;
  return <span className="sb-badge" data-tone="danger">Creation failed</span>;
}

function SecurityChecklist({ account }: { account: SmartAccountDeployment }) {
  const live = account.status === "deployed";
  const items: { state: "done" | "todo" | "unavailable"; title: string; detail: string }[] = [
    {
      state: live ? "done" : "todo",
      title: "Passkey owner",
      detail: live
        ? "Your passkey is the account's owner. Payments need a signature from this device."
        : "Becomes active once Stellar confirms the account.",
    },
    account.guardian_address
      ? { state: live ? "done" : "todo", title: "Recovery guardian", detail: `Your wallet ${short(account.guardian_address)} can start a time-delayed recovery if you lose this device.` }
      : { state: "todo", title: "No recovery guardian", detail: "If you lose this passkey there is no way to recover the account." },
    { state: "unavailable", title: "Spending limits and second devices", detail: "Supported by the account contract; controls for them in the app are coming next." },
  ];
  return (
    <ul className="sb-checklist" aria-label={`Security for ${account.label}`}>
      {items.map((i) => (
        <li key={i.title} data-state={i.state}>
          {i.state === "done" ? <CircleCheck size={18} aria-hidden /> : i.state === "todo" ? <CircleDashed size={18} aria-hidden /> : <CircleMinus size={18} aria-hidden />}
          <span><strong>{i.title}</strong>{i.detail}</span>
        </li>
      ))}
    </ul>
  );
}

function AccountCard({ account }: { account: SmartAccountDeployment }) {
  return (
    <article className="sb-card" aria-label={account.label}>
      <div className="sb-card-row">
        <div>
          <h3>{account.label}</h3>
          <p className="sb-muted">Smart account · Stellar Testnet</p>
        </div>
        <StatusBadge status={account.status} />
      </div>
      <div style={{ marginTop: 20, display: "grid", gap: 20 }}>
        <SecurityChecklist account={account} />
        <dl className="sb-details">
          <dt>Account address</dt>
          <dd className="sb-mono">{account.contract_address}</dd>
          <dt>Created by</dt>
          <dd>
            <a className="sb-link" href={`${EXPLORER}/tx/${account.tx_hash}`} target="_blank" rel="noreferrer">
              Transaction {short(account.tx_hash)} <ExternalLink size={12} aria-hidden />
            </a>
            {account.ledger ? ` · ledger ${account.ledger.toLocaleString()}` : ""}
          </dd>
          <dt>Passkey domain</dt>
          <dd>{account.rp_id}</dd>
        </dl>
      </div>
    </article>
  );
}

function PrivacyFacts() {
  return (
    <section className="sb-section" aria-labelledby="sa-privacy-title">
      <h2 id="sa-privacy-title" className="sb-section-title">What a smart account reveals</h2>
      <div className="sb-privacy-facts">
        <div className="sb-privacy-fact" data-level="protected">
          <h4>Stays on your device</h4>
          <p>Your passkey&apos;s private key. Neither StealthBridge nor Stellar ever receives it.</p>
        </div>
        <div className="sb-privacy-fact" data-level="encrypted">
          <h4>Stored by StealthBridge</h4>
          <p>The account&apos;s label, passkey ID and public key, so you can find and use it again.</p>
        </div>
        <div className="sb-privacy-fact" data-level="public">
          <h4>Public on Stellar</h4>
          <p>The account address, its public signer keys and every payment it makes. A smart account adds control, not confidentiality.</p>
        </div>
      </div>
    </section>
  );
}

const noopSubscribe = () => () => {};

export function SmartAccountsWorkspace({ address }: { address: string }) {
  const [directory, setDirectory] = useState<DeploymentDirectory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [label, setLabel] = useState("Everyday account");
  const [walletGuardian, setWalletGuardian] = useState(true);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  // Server snapshot is null (unknown); the client reads the real capability.
  const supported = useSyncExternalStore(noopSubscribe, passkeysSupported, () => null);
  const polls = useRef(0);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const d = await listDeployments(address, signal);
      if (!signal?.aborted) {
        setDirectory(d);
        setLoadError("");
      }
    } catch (e) {
      if (!signal?.aborted) setLoadError(e instanceof Error ? e.message : "The smart-account service is unavailable right now.");
    }
  }, [address]);

  useEffect(() => {
    const ctl = new AbortController();
    void refresh(ctl.signal);
    return () => ctl.abort();
  }, [refresh]);

  // While a deployment is confirming, re-read chain-backed status.
  const pending = directory?.deployments.some((d) => d.status === "submitted") ?? false;
  useEffect(() => {
    if (!pending) {
      polls.current = 0;
      return;
    }
    if (polls.current >= 20) return;
    const t = setTimeout(() => {
      polls.current += 1;
      void refresh();
    }, 4000);
    return () => clearTimeout(t);
  }, [pending, directory, refresh]);

  async function create() {
    setActionError("");
    if (!validLabel(label)) {
      setActionError("Give the account a name of up to 48 characters.");
      return;
    }
    setBusy(true);
    try {
      const passkey = await createPasskey(label.trim());
      await requestDeployment({
        label: label.trim(),
        public_key_hex: passkey.publicKeyHex,
        credential_id: passkey.credentialId,
        wallet_guardian: walletGuardian,
      });
      await refresh();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setActionError(
        name === "NotAllowedError" ? "Passkey creation was cancelled."
        : name === "SecurityError" ? "Passkeys only work on the StealthBridge website address, not from this location."
        : name === "InvalidStateError" ? "This device already has a passkey for that account."
        : e instanceof Error ? e.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  }

  const accounts = directory?.deployments ?? [];
  const atLimit = directory ? accounts.filter((a) => a.status !== "failed").length >= directory.max_deployments : false;
  const blockedReason =
    supported === false ? "This browser can't create passkeys. Try a recent version of Chrome, Safari, Edge or Firefox."
    : directory && !directory.relayer_configured ? "Smart-account creation isn't switched on for this environment yet."
    : atLimit ? "You've reached the limit of smart accounts for this wallet."
    : "";

  return (
    <div className="sb-page">
      <header className="sb-page-header">
        <div>
          <span className="sb-eyebrow">Account · Smart accounts</span>
          <h1>Smart accounts</h1>
          <p>
            A smart account is a Stellar account controlled by a passkey on your phone or laptop instead of a recovery phrase.
            We cover the network fee to create it.
          </p>
        </div>
      </header>

      <section className="sb-card" aria-labelledby="sa-create-title">
        <div className="sb-card-row">
          <div>
            <h2 id="sa-create-title" className="sb-section-title">Create a passkey account</h2>
            <p className="sb-muted">Your device will ask you to confirm with Face ID, a fingerprint or your screen lock. Testnet only, no real funds.</p>
          </div>
          <Fingerprint size={24} aria-hidden style={{ color: "var(--sb-brand-300)" }} />
        </div>
        <div style={{ display: "grid", gap: 16, marginTop: 20, maxWidth: 520 }}>
          <label className="sb-field">
            Account name
            <input className="sb-input" value={label} maxLength={48} onChange={(e) => setLabel(e.target.value)} disabled={busy} />
          </label>
          <label className="sb-check">
            <input type="checkbox" checked={walletGuardian} onChange={(e) => setWalletGuardian(e.target.checked)} disabled={busy} />
            <span>Use my signed-in Stellar wallet ({short(address)}) to recover this account if I lose my passkey. Recommended.</span>
          </label>
          {blockedReason ? <div className="sb-alert" role="status">{blockedReason}</div> : null}
          {actionError ? <div className="sb-alert" data-tone="danger" role="alert">{actionError}</div> : null}
          <div>
            <button type="button" className="sb-btn sb-btn-primary" onClick={create} disabled={busy || !!blockedReason || !directory}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <KeyRound size={16} aria-hidden />}
              {busy ? "Creating your account…" : "Create with passkey"}
            </button>
          </div>
        </div>
      </section>

      <section className="sb-section" aria-labelledby="sa-list-title">
        <h2 id="sa-list-title" className="sb-section-title">Your accounts</h2>
        {loadError ? <div className="sb-alert" data-tone="danger" role="alert">{loadError}</div> : null}
        {!directory && !loadError ? <p className="sb-muted" role="status">Loading your accounts…</p> : null}
        {directory && accounts.length === 0 ? (
          <div className="sb-alert" role="status">You don&apos;t have a smart account yet. Create one above; it takes a few seconds.</div>
        ) : null}
        {accounts.map((a) => <AccountCard key={a.contract_address} account={a} />)}
      </section>

      <PrivacyFacts />
    </div>
  );
}
