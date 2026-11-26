"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowUpRight, CircleCheck, CircleDashed, CircleX, ExternalLink, Receipt, RefreshCw, Send, X } from "lucide-react";
import { assetLabel, formatStroops, type PaymentRecord } from "@/lib/smart-account-payments";
import { EXPLORER, short, statusMeta, useMoney, when } from "@/lib/use-money";

type Filter = "all" | "done" | "progress" | "failed";
const FILTERS: [Filter, string][] = [["all", "All"], ["done", "Completed"], ["progress", "In progress"], ["failed", "Failed"]];

function matches(p: PaymentRecord, f: Filter) {
  if (f === "all") return true;
  if (f === "done") return p.status === "confirmed";
  if (f === "progress") return ["prepared", "submitting", "submitted"].includes(p.status);
  return p.status === "failed" || p.status === "expired";
}

const ERRORS: Record<string, string> = {
  EVIDENCE_MISMATCH: "The transaction on Stellar didn't match what you approved, so StealthBridge didn't count it as this payment.",
  FAILED_ON_CHAIN: "Stellar rejected the transaction. No funds left your account.",
  NOT_INCLUDED: "The transaction expired before Stellar included it. No funds left your account.",
  SUBMISSION_REJECTED: "Stellar refused the transaction. No funds left your account.",
  REJECTED_BY_ACCOUNT: "Your smart account didn't accept the approval. Nothing was sent.",
  AUTHORIZATION_EXPIRED: "The approval expired before it was used.",
};

function Timeline({ p }: { p: PaymentRecord }) {
  const approved = !["prepared", "expired"].includes(p.status) || p.tx_hash !== null;
  const sent = p.tx_hash !== null;
  const done = p.status === "confirmed";
  const failed = p.status === "failed" || p.status === "expired";
  const steps = [
    { label: "Approved with your passkey", state: approved ? "done" : failed ? "unavailable" : "todo" },
    { label: "Submitted to Stellar", state: sent ? "done" : failed ? "unavailable" : "todo" },
    { label: done ? `Confirmed in ledger ${p.ledger?.toLocaleString()}` : failed ? "Not completed" : "Waiting for confirmation", state: done ? "done" : failed ? "unavailable" : "todo" },
  ];
  return (
    <ul className="sb-checklist" aria-label="Payment progress">
      {steps.map((s) => (
        <li key={s.label} data-state={s.state}>
          {s.state === "done" ? <CircleCheck size={17} aria-hidden /> : s.state === "todo" ? <CircleDashed size={17} aria-hidden /> : <CircleX size={17} aria-hidden />}
          <span><strong>{s.label}</strong></span>
        </li>
      ))}
    </ul>
  );
}

function Receipt_({ p, onClose }: { p: PaymentRecord; onClose: () => void }) {
  const meta = statusMeta(p.status);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  // Portal to <body> so the panel overlays the whole app, not just the page column.
  return createPortal(
    <>
      <div className="sb-drawer-backdrop" onClick={onClose} aria-hidden />
      <aside className="sb-side-panel" role="dialog" aria-modal="true" aria-label="Payment details">
        <div className="sb-panel-head">
          <strong>Payment details</strong>
          <button type="button" className="sb-icon-btn" onClick={onClose} aria-label="Close payment details" autoFocus><X size={18} aria-hidden /></button>
        </div>
        <div className="sb-panel-body">
          <div style={{ textAlign: "center", display: "grid", gap: 10 }}>
            <span className="sb-badge" data-tone={meta.tone} style={{ justifySelf: "center" }}>{meta.label}</span>
            <div className="sb-receipt-amount">{formatStroops(p.amount_stroops)} <span style={{ fontSize: 18, color: "var(--sb-ink-3)" }}>{assetLabel(p.asset)}</span></div>
            <span className="sb-muted">to <span className="sb-mono">{short(p.destination, 8)}</span></span>
          </div>
          {p.error_code && ERRORS[p.error_code] ? <div className="sb-alert" data-tone="danger" role="status">{ERRORS[p.error_code]}</div> : null}
          <Timeline p={p} />
          <dl className="sb-details">
            <dt>From</dt><dd className="sb-mono">{p.contract_address}</dd>
            <dt>To</dt><dd className="sb-mono">{p.destination}</dd>
            <dt>Asset</dt><dd>{assetLabel(p.asset)}{p.asset !== "XLM" ? <span className="sb-subtle"> · issued by {short(p.asset.split(":")[1] ?? "", 4)}</span> : null}</dd>
            <dt>Network</dt><dd>Stellar Testnet</dd>
            <dt>Network fee</dt><dd>Paid by StealthBridge (estimated {formatStroops(p.fee_estimate_stroops)} XLM)</dd>
            <dt>Created</dt><dd>{when(p.created_at_unix)}</dd>
            {p.tx_hash ? (<><dt>Transaction</dt><dd><a className="sb-link" href={`${EXPLORER}/tx/${p.tx_hash}`} target="_blank" rel="noreferrer">{short(p.tx_hash, 8)} <ExternalLink size={12} aria-hidden /></a></dd></>) : null}
          </dl>
          <div className="sb-privacy-facts">
            <div className="sb-privacy-fact" data-level="public"><h4>Public on Stellar</h4><p>Sender, recipient, asset, amount and time are visible to anyone. This payment was not confidential.</p></div>
            <div className="sb-privacy-fact" data-level="protected"><h4>Verified by StealthBridge</h4><p>{p.status === "confirmed" ? "We checked the ledger's transfer record against exactly what you approved." : "We'll mark it completed only after the ledger proves it."}</p></div>
          </div>
        </div>
      </aside>
    </>,
    document.body,
  );
}

export function Activity({ address }: { address: string }) {
  const money = useMoney(address, { pollWhilePending: true });
  const [filter, setFilter] = useState<Filter>("all");
  const params = useSearchParams();
  const router = useRouter();
  const openId = params?.get("payment") ?? null;
  const all = useMemo(() => money.payments?.payments ?? [], [money.payments]);
  const rows = all.filter((p) => matches(p, filter));
  const open = openId ? all.find((p) => p.id === openId) ?? null : null;
  const setOpen = (id: string | null) => router.replace(id ? `/app/activity?payment=${id}` : "/app/activity", { scroll: false });

  return (
    <div className="sb-page">
      <header className="sb-page-header">
        <div>
          <span className="sb-eyebrow">Money</span>
          <h1>Activity</h1>
          <p>Every payment you&apos;ve approved, with its status straight from the Stellar ledger.</p>
        </div>
        <button type="button" className="sb-btn sb-btn-secondary sb-btn-sm" onClick={() => void money.refresh()}><RefreshCw size={14} aria-hidden /> Refresh</button>
      </header>

      <div className="sb-segmented" role="group" aria-label="Filter payments">
        {FILTERS.map(([f, label]) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{label}</button>
        ))}
      </div>

      <section className="sb-card sb-card-flush" aria-label="Payments">
        {money.status === "loading" ? (
          <div style={{ padding: 20, display: "grid", gap: 14 }}>
            {[0, 1, 2, 3].map((i) => <span key={i} className="sb-skeleton" style={{ display: "block", height: 40 }} aria-hidden />)}
          </div>
        ) : money.status === "error" || money.paymentsError ? (
          <div className="sb-empty" role="status"><h3>Activity unavailable</h3><p>{money.error || "We couldn't load your payments right now. Your funds are unaffected."}</p>
            <button type="button" className="sb-btn sb-btn-secondary sb-btn-sm" onClick={() => void money.refresh()}>Try again</button></div>
        ) : rows.length === 0 ? (
          <div className="sb-empty">
            <span className="sb-empty-icon"><Receipt size={22} aria-hidden /></span>
            <h3>{filter === "all" ? "No payments yet" : "Nothing here"}</h3>
            <p>{filter === "all" ? "When you send money from a smart account, it shows up here with its live status." : "No payments match this filter."}</p>
            {filter === "all" ? <Link className="sb-btn sb-btn-primary sb-btn-sm" href="/app/send"><Send size={14} aria-hidden /> Send money</Link> : null}
          </div>
        ) : (
          <ul className="sb-list">
            {rows.map((p) => {
              const meta = statusMeta(p.status);
              return (
                <li key={p.id}>
                  <button type="button" className="sb-row sb-row-button" onClick={() => setOpen(p.id)} aria-label={`Payment of ${formatStroops(p.amount_stroops)} ${assetLabel(p.asset)} to ${short(p.destination)}, ${meta.label}`}>
                    <span className="sb-row-icon"><ArrowUpRight size={18} aria-hidden /></span>
                    <span className="sb-row-main"><strong>To {short(p.destination)}</strong><span>{when(p.created_at_unix)} · from {short(p.contract_address, 4)}</span></span>
                    <span className="sb-row-end">
                      <span className="sb-amount-out">−{formatStroops(p.amount_stroops)} {assetLabel(p.asset)}</span>
                      <span className="sb-badge" data-tone={meta.tone}>{meta.label}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {open ? <Receipt_ p={open} onClose={() => setOpen(null)} /> : null}
    </div>
  );
}
