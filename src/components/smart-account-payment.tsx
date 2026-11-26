"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CircleCheck, CircleX, Copy, ExternalLink, Fingerprint, Loader2, Send, ShieldCheck } from "lucide-react";
import {
  assetLabel,
  authorizeWithPasskey,
  formatStroops,
  preparePayment,
  submitPayment,
  toStroops,
  type PreparedPayment,
} from "@/lib/smart-account-payments";
import { EXPLORER, short, useMoney } from "@/lib/use-money";

type Step =
  | { kind: "recipient" }
  | { kind: "amount" }
  | { kind: "review"; prepared: PreparedPayment }
  | { kind: "processing"; phase: "passkey" | "sending"; prepared: PreparedPayment }
  | { kind: "result"; id: string; tx: string };

const STEPS = ["Recipient", "Amount", "Review", "Done"] as const;

function stepIndex(s: Step) {
  return s.kind === "recipient" ? 0 : s.kind === "amount" ? 1 : s.kind === "review" || s.kind === "processing" ? 2 : 3;
}

export function SmartAccountPayment({ address }: { address: string }) {
  const money = useMoney(address, { pollWhilePending: true });
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [toTouched, setToTouched] = useState(false);
  const [asset, setAsset] = useState("XLM");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>({ kind: "recipient" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = from || money.accounts[0]?.contract_address || "";
  const available = useMemo(
    () => money.balances?.find((b) => b.contract_address === selected)?.balances.find((b) => b.asset === asset)?.balance_stroops ?? null,
    [money.balances, selected, asset],
  );
  const stroops = toStroops(amount);
  const recipientOk = /^[GC][A-Z2-7]{55}$/.test(to) && to !== selected;
  const overBalance = stroops !== null && available !== null && BigInt(stroops) > BigInt(available);
  const account = money.accounts.find((a) => a.contract_address === selected);
  const recipientError = toTouched && to !== "" && !recipientOk;

  useEffect(() => {
    if (step.kind === "result") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step.kind]);

  function next() {
    setError("");
    setToTouched(true);
    if (!selected) return setError("Choose the account to pay from.");
    if (!recipientOk) return setError("Enter a valid Stellar address for the recipient (it starts with G or C).");
    setStep({ kind: "amount" });
  }

  async function review() {
    setError("");
    if (stroops === null) return setError("Enter an amount with up to 7 decimal places.");
    if (overBalance) return setError("The amount is more than this account's available balance.");
    setBusy(true);
    try {
      const prepared = await preparePayment({ contract_address: selected, destination: to, asset, amount_stroops: stroops });
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
    setStep({ kind: "processing", phase: "passkey", prepared });
    try {
      const assertion = await authorizeWithPasskey(prepared, {
        account: selected, destination: to, asset, amountStroops: stroops ?? 0, networkPassphrase: prepared.network_passphrase,
      });
      setStep({ kind: "processing", phase: "sending", prepared });
      const { tx_hash } = await submitPayment(prepared.id, assertion);
      setStep({ kind: "result", id: prepared.id, tx: tx_hash });
      await money.refresh();
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      setStep({ kind: "review", prepared });
      setError(name === "NotAllowedError" ? "Passkey approval was cancelled. Nothing was sent." : e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function restart() {
    setStep({ kind: "recipient" });
    setAmount("");
    setTo("");
    setToTouched(false);
    setError("");
  }

  if (money.status === "loading") {
    return (
      <div className="sb-card" role="status" style={{ display: "grid", gap: 14 }}>
        <span className="sb-skeleton" style={{ display: "block", height: 6 }} aria-hidden />
        <span className="sb-skeleton" style={{ display: "block", height: 46 }} aria-hidden />
        <span className="sb-skeleton" style={{ display: "block", height: 46, width: "60%" }} aria-hidden />
        <span className="sb-subtle">Loading your accounts…</span>
      </div>
    );
  }
  if (money.status === "error") return <div className="sb-alert" data-tone="danger" role="alert">{money.error}</div>;
  if (money.payments && !money.payments.payments_configured) {
    return <div className="sb-alert" role="status">Payments aren&apos;t switched on for this environment yet.</div>;
  }
  if (money.accounts.length === 0) {
    return (
      <div className="sb-card sb-empty">
        <span className="sb-empty-icon"><Fingerprint size={22} aria-hidden /></span>
        <h3>Create a smart account to send money</h3>
        <p>Payments are approved with your passkey from a StealthBridge smart account. It takes a few seconds to create one.</p>
        <Link className="sb-btn sb-btn-primary" href="/app/accounts">Create a smart account</Link>
      </div>
    );
  }

  const idx = stepIndex(step);
  const sent = step.kind === "result" ? money.payments?.payments.find((p) => p.id === step.id) : undefined;

  return (
    <div className="sb-split">
      <section className="sb-card" style={{ padding: 28 }} aria-live="polite">
        <ol className="sb-stepper" aria-label="Payment steps">
          {STEPS.map((label, i) => (
            <li key={label} data-state={i < idx ? "done" : i === idx ? "current" : "todo"} aria-current={i === idx ? "step" : undefined}>{label}</li>
          ))}
        </ol>

        <div key={step.kind} className="sb-enter" style={{ marginTop: 28 }}>
          {step.kind === "recipient" ? (
            <>
              <h2 className="sb-section-title">Who are you paying?</h2>
              <div className="sb-form-grid">
                <label className="sb-field sb-span-2">
                  Pay from
                  <select className="sb-input" value={selected} onChange={(e) => setFrom(e.target.value)}>
                    {money.accounts.map((a) => <option key={a.contract_address} value={a.contract_address}>{a.label} · {short(a.contract_address, 4)}</option>)}
                  </select>
                </label>
                <label className="sb-field sb-span-2">
                  Recipient Stellar address
                  <input className="sb-input sb-num" value={to} onChange={(e) => setTo(e.target.value.trim().toUpperCase())} onBlur={() => setToTouched(true)}
                    placeholder="G… or C…" spellCheck={false} autoComplete="off" aria-invalid={recipientError} aria-describedby="to-hint" />
                  <span id="to-hint" className={recipientError ? "sb-field-error" : "sb-field-hint"}>
                    {recipientError ? (to === selected ? "You can't send to the same account." : "That isn't a valid Stellar address.")
                      : "A Stellar account (G…) or contract (C…) address. Check it carefully: payments can't be reversed."}
                  </span>
                </label>
              </div>
              {error ? <div className="sb-alert" data-tone="danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}
              <div className="sb-actions">
                <button type="button" className="sb-btn sb-btn-primary sb-btn-lg" onClick={next}>Continue <ArrowRight size={16} aria-hidden /></button>
              </div>
            </>
          ) : null}

          {step.kind === "amount" ? (
            <>
              <h2 className="sb-section-title">How much?</h2>
              <p className="sb-muted" style={{ marginTop: 4 }}>To <span className="sb-mono">{short(to, 8)}</span></p>
              <div className="sb-amount" style={{ marginTop: 18 }}>
                <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.trim())} placeholder="0.00" aria-label="Amount to send" aria-invalid={overBalance} />
                <select value={asset} onChange={(e) => setAsset(e.target.value)} aria-label="Asset">
                  {(money.payments?.assets ?? ["XLM"]).map((a) => <option key={a} value={a}>{assetLabel(a)}</option>)}
                </select>
              </div>
              <div className="sb-card-row" style={{ marginTop: 10, alignItems: "center" }}>
                <span className={overBalance ? "sb-field-error" : "sb-field-hint"}>
                  {available === null ? (money.balanceError ? "Balance unavailable" : "Checking balance…") : `Available: ${formatStroops(available)} ${assetLabel(asset)}`}
                </span>
                {available !== null && available !== "0" ? (
                  <button type="button" className="sb-link" style={{ fontSize: 13 }} onClick={() => setAmount(formatStroops(available).replace(/,/g, ""))}>Use max</button>
                ) : null}
              </div>
              {available === "0" ? (
                <div className="sb-alert" role="status" style={{ marginTop: 14 }}>
                  <span><strong>Add funds to start sending.</strong> Send {assetLabel(asset)} from your Stellar wallet (for example Freighter, on Testnet) to this account:{" "}
                    <span className="sb-mono">{selected}</span>{" "}
                    <button type="button" className="sb-link" onClick={() => void navigator.clipboard?.writeText(selected)}><Copy size={12} aria-hidden /> Copy address</button>
                  </span>
                </div>
              ) : null}
              {error ? <div className="sb-alert" data-tone="danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}
              <div className="sb-actions">
                <button type="button" className="sb-btn sb-btn-ghost" onClick={() => { setStep({ kind: "recipient" }); setError(""); }} disabled={busy}><ArrowLeft size={16} aria-hidden /> Back</button>
                <button type="button" className="sb-btn sb-btn-primary sb-btn-lg" onClick={review} disabled={busy}>
                  {busy ? <Loader2 size={16} className="sb-spin" aria-hidden /> : null}
                  {busy ? "Checking with Stellar…" : "Continue to review"}
                </button>
              </div>
            </>
          ) : null}

          {step.kind === "review" || step.kind === "processing" ? (
            <>
              <h2 className="sb-section-title">Review and approve</h2>
              <p className="sb-muted" style={{ marginTop: 4 }}>Your passkey approves exactly this payment. The approval can&apos;t be reused and expires in about 10 minutes.</p>
              <div style={{ textAlign: "center", padding: "26px 0 18px" }}>
                <div className="sb-receipt-amount">{formatStroops(step.prepared.amount_stroops)} <span style={{ fontSize: 18, color: "var(--sb-ink-3)" }}>{assetLabel(step.prepared.asset)}</span></div>
              </div>
              <dl className="sb-details">
                <dt>From</dt><dd>{account?.label} <span className="sb-mono" style={{ color: "var(--sb-ink-3)" }}>{short(step.prepared.contract_address, 6)}</span></dd>
                <dt>To</dt><dd className="sb-mono">{step.prepared.destination}</dd>
                <dt>Network</dt><dd>Stellar Testnet (no real money)</dd>
                <dt>Network fee</dt><dd>Paid by StealthBridge (about {formatStroops(step.prepared.fee_estimate_stroops)} XLM)</dd>
                <dt>Approved by</dt><dd>Your passkey on this device</dd>
              </dl>
              <div className="sb-privacy-facts" style={{ marginTop: 20 }} aria-label="What this payment reveals">
                <div className="sb-privacy-fact" data-level="public"><h4>Public on Stellar</h4><p>Sender account, recipient, asset, amount and time. This is a standard Stellar payment, not a confidential one.</p></div>
                <div className="sb-privacy-fact" data-level="protected"><h4>Only you can approve</h4><p>The approval is signed on your device. StealthBridge pays the fee but can&apos;t move your funds.</p></div>
              </div>
              {error ? <div className="sb-alert" data-tone="danger" role="alert" style={{ marginTop: 16 }}>{error}</div> : null}
              {step.kind === "processing" ? (
                <div className="sb-alert" data-tone="info" role="status" style={{ marginTop: 18 }}>
                  <Loader2 size={16} className="sb-spin" aria-hidden />
                  <span>{step.phase === "passkey" ? "Waiting for your passkey… Confirm on your device." : "Sending to Stellar…"}</span>
                </div>
              ) : (
                <div className="sb-actions">
                  <button type="button" className="sb-btn sb-btn-ghost" onClick={() => { setStep({ kind: "amount" }); setError(""); }} disabled={busy}><ArrowLeft size={16} aria-hidden /> Edit</button>
                  <button type="button" className="sb-btn sb-btn-brand sb-btn-lg" onClick={() => approve(step.prepared)} disabled={busy}>
                    <Fingerprint size={17} aria-hidden /> Approve with passkey
                  </button>
                </div>
              )}
            </>
          ) : null}

          {step.kind === "result" ? (
            <div style={{ textAlign: "center", display: "grid", gap: 14, padding: "8px 0" }}>
              <span className="sb-result-icon" data-tone={sent?.status === "confirmed" ? "success" : sent?.status === "failed" ? "danger" : "pending"}>
                {sent?.status === "confirmed" ? <CircleCheck size={30} aria-hidden /> : sent?.status === "failed" ? <CircleX size={30} aria-hidden /> : <Loader2 size={28} className="sb-spin" aria-hidden />}
              </span>
              <h2 className="sb-section-title" style={{ fontSize: 22 }}>
                {sent?.status === "confirmed" ? "Payment confirmed" : sent?.status === "failed" ? "Payment failed" : "Payment sent to Stellar"}
              </h2>
              <p className="sb-muted">
                {sent?.status === "confirmed" ? `Included in ledger ${sent.ledger?.toLocaleString()}. StealthBridge verified the transaction matches what you approved.`
                  : sent?.status === "failed" ? "Stellar did not complete this payment. No funds left your account."
                  : "Waiting for Stellar to confirm. This usually takes a few seconds."}
              </p>
              <div className="sb-actions" style={{ justifyContent: "center" }}>
                <Link className="sb-btn sb-btn-secondary" href={`/app/activity?payment=${step.id}`}>View receipt</Link>
                <button type="button" className="sb-btn sb-btn-primary" onClick={restart}><Send size={15} aria-hidden /> New payment</button>
              </div>
              <a className="sb-link" style={{ justifySelf: "center", fontSize: 13 }} href={`${EXPLORER}/tx/${step.tx}`} target="_blank" rel="noreferrer">View transaction <ExternalLink size={12} aria-hidden /></a>
            </div>
          ) : null}
        </div>
      </section>

      <aside className="sb-section" aria-label="How payments work">
        <div className="sb-card">
          <div className="sb-card-row" style={{ alignItems: "center" }}>
            <h3>How your payment is protected</h3>
            <ShieldCheck size={18} aria-hidden style={{ color: "var(--sb-brand)" }} />
          </div>
          <ul className="sb-checklist" style={{ marginTop: 14 }}>
            <li data-state="done"><CircleCheck size={16} aria-hidden /><span><strong>You approve every payment</strong>With the passkey on your device: Face ID, fingerprint or PIN.</span></li>
            <li data-state="done"><CircleCheck size={16} aria-hidden /><span><strong>Exact-match approvals</strong>Your browser checks the recipient and amount before asking your passkey.</span></li>
            <li data-state="done"><CircleCheck size={16} aria-hidden /><span><strong>Confirmed by the ledger</strong>Completed only after Stellar records the transfer you approved.</span></li>
          </ul>
        </div>
        <p className="sb-subtle" style={{ padding: "0 4px" }}>
          Planning an international transfer? <Link className="sb-link" href="/app/routes">Explore cross-border routes</Link>
        </p>
      </aside>
    </div>
  );
}
