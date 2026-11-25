"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleCheck, CircleX, ExternalLink, Fingerprint, Loader2, Send } from "lucide-react";
import { listDeployments, type SmartAccountDeployment } from "@/lib/smart-account-deployments";
import {
  assetLabel,
  authorizeWithPasskey,
  formatStroops,
  listBalances,
  listPayments,
  preparePayment,
  submitPayment,
  toStroops,
  type AccountBalances,
  type PaymentDirectory,
  type PaymentRecord,
  type PreparedPayment,
} from "@/lib/smart-account-payments";

const EXPLORER = "https://stellar.expert/explorer/testnet";
const short = (v: string) => `${v.slice(0, 6)}…${v.slice(-6)}`;

type Step = { kind: "details" } | { kind: "review"; prepared: PreparedPayment } | { kind: "sent"; id: string; tx: string };

function StatusBadge({ status }: { status: PaymentRecord["status"] }) {
  const map: Record<PaymentRecord["status"], [string, string]> = {
    confirmed: ["success", "Confirmed on Stellar"],
    submitted: ["warning", "Confirming"],
    submitting: ["warning", "Sending"],
    prepared: ["neutral", "Awaiting approval"],
    expired: ["neutral", "Approval expired"],
    failed: ["danger", "Failed"],
  };
  const [tone, label] = map[status];
  return <span className="sb-badge" data-tone={tone}>{label}</span>;
}

function History({ payments }: { payments: PaymentRecord[] }) {
  if (payments.length === 0) return <div className="sb-alert" role="status">No payments yet. Payments you approve will appear here once Stellar confirms them.</div>;
  return (
    <ul className="sb-pay-history" aria-label="Recent payments">
      {payments.map((p) => (
        <li key={p.id} className="sb-pay-row">
          <div>
            <strong>{formatStroops(p.amount_stroops)} {assetLabel(p.asset)}</strong>
            <span className="sb-muted">to {short(p.destination)} · from {short(p.contract_address)}</span>
          </div>
          <div className="sb-pay-row-end">
            <StatusBadge status={p.status} />
            {p.tx_hash && p.status === "confirmed" ? (
              <a className="sb-link" href={`${EXPLORER}/tx/${p.tx_hash}`} target="_blank" rel="noreferrer">
                Receipt <ExternalLink size={12} aria-hidden />
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SmartAccountPayment({ address }: { address: string }) {
  const [accounts, setAccounts] = useState<SmartAccountDeployment[] | null>(null);
  const [balances, setBalances] = useState<AccountBalances[]>([]);
  const [directory, setDirectory] = useState<PaymentDirectory | null>(null);
  const [loadError, setLoadError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [asset, setAsset] = useState("XLM");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>({ kind: "details" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const polls = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const [d, p] = await Promise.all([listDeployments(address), listPayments(address)]);
      const live = d.deployments.filter((x) => x.status === "deployed");
      setAccounts(live);
      setDirectory(p);
      setFrom((f) => f || live[0]?.contract_address || "");
      setLoadError("");
      if (live.length) listBalances().then(setBalances).catch(() => setBalances([]));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "The payment service is unavailable right now.");
    }
  }, [address]);

  useEffect(() => { void refresh(); }, [refresh]);

  const pending = directory?.payments.some((p) => p.status === "submitted" || p.status === "submitting") ?? false;
  useEffect(() => {
    if (!pending || polls.current >= 30) return;
    const t = setTimeout(() => { polls.current += 1; void refresh(); }, 3000);
    return () => clearTimeout(t);
  }, [pending, directory, refresh]);

  const available = balances.find((b) => b.contract_address === from)?.balances.find((b) => b.asset === asset)?.balance_stroops ?? null;
  const stroops = toStroops(amount);
  const recipientOk = /^[GC][A-Z2-7]{55}$/.test(to) && to !== from;
  const overBalance = stroops !== null && available !== null && BigInt(stroops) > BigInt(available);

  async function review() {
    setError("");
    if (!from) return setError("Choose the account to pay from.");
    if (!recipientOk) return setError("Enter a valid Stellar address for the recipient (starts with G or C).");
    if (stroops === null) return setError("Enter an amount with up to 7 decimal places.");
    if (overBalance) return setError("The amount is more than this account's available balance.");
    setBusy(true);
    try {
      const prepared = await preparePayment({ contract_address: from, destination: to, asset, amount_stroops: stroops });
      setStep({ kind: "review", prepared });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(prepared: PreparedPayment) {
    setError("");
    setBusy(true);
    try {
      const assertion = await authorizeWithPasskey(prepared, {
        account: from, destination: to, asset, amountStroops: stroops ?? 0, networkPassphrase: prepared.network_passphrase,
      });
      const { tx_hash } = await submitPayment(prepared.id, assertion);
      polls.current = 0;
      setStep({ kind: "sent", id: prepared.id, tx: tx_hash });
      await refresh();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setError(name === "NotAllowedError" ? "Passkey approval was cancelled. Nothing was sent." : e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <div className="sb-alert" data-tone="danger" role="alert">{loadError}</div>;
  if (!accounts || !directory) return <p className="sb-muted" role="status">Loading your accounts…</p>;
  if (!directory.payments_configured) {
    return <div className="sb-alert" role="status">Payments aren&apos;t switched on for this environment yet.</div>;
  }
  if (accounts.length === 0) {
    return (
      <div className="sb-card">
        <h3>Create a smart account to send money</h3>
        <p className="sb-muted">Payments are approved with your passkey from a StealthBridge smart account.</p>
        <div style={{ marginTop: 16 }}><Link className="sb-btn sb-btn-primary" href="/app/accounts">Create a smart account</Link></div>
      </div>
    );
  }

  const sent = step.kind === "sent" ? directory.payments.find((p) => p.id === step.id) : undefined;

  return (
    <div className="sb-section">
      {step.kind === "details" ? (
        <section className="sb-card" aria-labelledby="pay-title">
          <h2 id="pay-title" className="sb-section-title">Payment details</h2>
          <div className="sb-form-grid">
            <label className="sb-field">
              From
              <select className="sb-input" value={from} onChange={(e) => setFrom(e.target.value)} disabled={busy}>
                {accounts.map((a) => <option key={a.contract_address} value={a.contract_address}>{a.label} ({short(a.contract_address)})</option>)}
              </select>
              <small className="sb-muted">
                {available === null ? "Balance unavailable" : `Available: ${formatStroops(available)} ${assetLabel(asset)}`}
              </small>
            </label>
            {available === "0" ? (
              <div className="sb-alert sb-span-2" role="status">
                <span>
                  <strong>Add funds to start sending.</strong> Send {assetLabel(asset)} from your Stellar wallet (for example Freighter, on Testnet)
                  to your smart account address: <span className="sb-mono" style={{ overflowWrap: "anywhere" }}>{from}</span>{" "}
                  <button type="button" className="sb-link" style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}
                    onClick={() => void navigator.clipboard?.writeText(from)}>Copy address</button>
                </span>
              </div>
            ) : null}
            <label className="sb-field">
              Asset
              <select className="sb-input" value={asset} onChange={(e) => setAsset(e.target.value)} disabled={busy}>
                {directory.assets.map((a) => <option key={a} value={a}>{assetLabel(a)}</option>)}
              </select>
            </label>
            <label className="sb-field sb-span-2">
              Recipient Stellar address
              <input className="sb-input sb-mono" value={to} onChange={(e) => setTo(e.target.value.trim().toUpperCase())} placeholder="G… or C…" spellCheck={false} autoComplete="off" disabled={busy} />
            </label>
            <label className="sb-field">
              Amount to send
              <input className="sb-input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} placeholder="0.00" disabled={busy} />
            </label>
          </div>
          {error ? <div className="sb-alert" data-tone="danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}
          <div style={{ marginTop: 20 }}>
            <button type="button" className="sb-btn sb-btn-primary" onClick={review} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
              {busy ? "Checking with Stellar…" : "Continue to review"}
            </button>
          </div>
        </section>
      ) : null}

      {step.kind === "review" ? (
        <section className="sb-card" aria-labelledby="review-title">
          <h2 id="review-title" className="sb-section-title">Review and approve</h2>
          <p className="sb-muted">Your passkey will approve exactly this payment and nothing else. It can&apos;t be reused, and it expires in about 10 minutes.</p>
          <dl className="sb-details" style={{ marginTop: 16 }}>
            <dt>You send</dt><dd><strong>{formatStroops(step.prepared.amount_stroops)} {assetLabel(step.prepared.asset)}</strong></dd>
            <dt>From</dt><dd className="sb-mono">{step.prepared.contract_address}</dd>
            <dt>To</dt><dd className="sb-mono">{step.prepared.destination}</dd>
            <dt>Network</dt><dd>Stellar Testnet (no real money)</dd>
            <dt>Network fee</dt><dd>Paid by StealthBridge (about {formatStroops(step.prepared.fee_estimate_stroops)} XLM)</dd>
            <dt>Approved by</dt><dd>Your passkey on this device</dd>
          </dl>
          <div className="sb-privacy-facts" style={{ marginTop: 20 }} aria-label="What this payment reveals">
            <div className="sb-privacy-fact" data-level="public">
              <h4>Public on Stellar</h4>
              <p>Sender account, recipient, asset, amount and time. This is a standard Stellar payment, not a confidential one.</p>
            </div>
            <div className="sb-privacy-fact" data-level="protected">
              <h4>Only you can approve</h4>
              <p>The approval is signed on your device. StealthBridge pays the fee but cannot move your funds.</p>
            </div>
            <div className="sb-privacy-fact" data-level="unavailable">
              <h4>Not yet available</h4>
              <p>Confidential amounts and private recipients. We&apos;ll label payments that have them when they&apos;re verified.</p>
            </div>
          </div>
          {error ? <div className="sb-alert" data-tone="danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}
          <div className="sb-actions">
            <button type="button" className="sb-btn sb-btn-secondary" onClick={() => { setStep({ kind: "details" }); setError(""); }} disabled={busy}>
              <ArrowLeft size={16} aria-hidden /> Edit
            </button>
            <button type="button" className="sb-btn sb-btn-primary" onClick={() => approve(step.prepared)} disabled={busy}>
              {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Fingerprint size={16} aria-hidden />}
              {busy ? "Waiting for your passkey…" : "Approve with passkey"}
            </button>
          </div>
        </section>
      ) : null}

      {step.kind === "sent" ? (
        <section className="sb-card" aria-labelledby="sent-title" aria-live="polite">
          <div className="sb-card-row">
            <h2 id="sent-title" className="sb-section-title">
              {sent?.status === "confirmed" ? "Payment confirmed" : sent?.status === "failed" ? "Payment failed" : "Payment sent to Stellar"}
            </h2>
            {sent?.status === "confirmed" ? <CircleCheck size={22} aria-hidden style={{ color: "var(--sb-success)" }} />
              : sent?.status === "failed" ? <CircleX size={22} aria-hidden style={{ color: "var(--sb-danger)" }} />
              : <Loader2 size={22} className="animate-spin" aria-hidden />}
          </div>
          <p className="sb-muted">
            {sent?.status === "confirmed" ? `Included in ledger ${sent.ledger?.toLocaleString()}. StealthBridge verified the transaction matches what you approved.`
              : sent?.status === "failed" ? "Stellar did not complete this payment. No funds left your account."
              : "Waiting for Stellar to confirm. This usually takes a few seconds."}
          </p>
          <div className="sb-actions">
            <a className="sb-link" href={`${EXPLORER}/tx/${step.tx}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12} aria-hidden /></a>
            <button type="button" className="sb-btn sb-btn-secondary" onClick={() => { setStep({ kind: "details" }); setAmount(""); }}>New payment</button>
          </div>
        </section>
      ) : null}

      <section className="sb-section" aria-labelledby="history-title">
        <h2 id="history-title" className="sb-section-title">Recent payments</h2>
        <History payments={directory.payments} />
      </section>
    </div>
  );
}
