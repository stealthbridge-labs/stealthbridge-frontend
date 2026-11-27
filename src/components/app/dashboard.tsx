"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Fingerprint, Receipt, RefreshCw, Send } from "lucide-react";
import { loadCustomerProfile, type CustomerProfile } from "@/lib/account-profile";
import { assetLabel, formatStroops } from "@/lib/smart-account-payments";
import { short, statusMeta, totalOf, useMoney, when } from "@/lib/use-money";

function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: number | string }) {
  return <span className="sb-skeleton" style={{ display: "block", height: h, width: w }} aria-hidden />;
}

/**
 * Customer home: which account, what balance, what next, what happened.
 * Everything shown comes from the backend (which reads Stellar); nothing is invented.
 */
export function Dashboard({ address, profilesEnabled }: { address: string; profilesEnabled: boolean }) {
  const money = useMoney(address, { pollWhilePending: true });
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profilesEnabled) return;
    const ctl = new AbortController();
    loadCustomerProfile(address, ctl.signal)
      .then((r) => { if (!ctl.signal.aborted) setProfile(r.profile); })
      .catch(() => undefined);
    return () => ctl.abort();
  }, [address, profilesEnabled]);

  const first = profile?.display_name.trim().split(/\s+/)[0];
  const account = money.accounts[0];
  const assets = money.payments?.assets ?? ["XLM"];
  const recent = money.payments?.payments.slice(0, 5) ?? [];

  async function copyAddress() {
    if (!account) return;
    try { await navigator.clipboard.writeText(account.contract_address); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch { /* clipboard denied */ }
  }

  return (
    <div className="sb-page sb-home">
      <header className="sb-home-head">
        <h1>{first ? `Good to see you, ${first}.` : "Welcome back."}</h1>
        <span className="sb-subtle">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
      </header>

      {money.status === "error" ? (
        <div className="sb-alert" data-tone="danger" role="alert">
          <span>{money.error}</span>
          <button type="button" className="sb-link" onClick={() => void money.refresh()}><RefreshCw size={14} aria-hidden /> Try again</button>
        </div>
      ) : null}

      {money.status === "loading" ? (
        <section className="sb-balance" aria-label="Account overview"><Skeleton h={14} w={140} /><Skeleton h={44} w="55%" /><Skeleton h={42} w={220} /></section>
      ) : !account ? (
        <section className="sb-balance sb-balance-empty" aria-labelledby="start-title">
          <span className="sb-balance-icon"><Fingerprint size={22} aria-hidden /></span>
          <div>
            <h2 id="start-title">Create your passkey account</h2>
            <p>One account, approved with your face, fingerprint or device PIN. It takes a few seconds.</p>
          </div>
          <Link className="sb-btn sb-btn-mint" href="/app/accounts">Create account</Link>
        </section>
      ) : (
        <section className="sb-balance" aria-labelledby="balance-title">
          <div className="sb-balance-top">
            <span id="balance-title">{account.label}{money.accounts.length > 1 ? ` · +${money.accounts.length - 1} more` : ""}</span>
            <span className="sb-mono">{short(account.contract_address, 4)}</span>
          </div>
          <div className="sb-balance-amounts" aria-live="polite">
            {money.balanceError ? (
              <span className="sb-balance-note">Your balance couldn&apos;t be read from Stellar right now.</span>
            ) : (
              assets.map((asset) => {
                const total = totalOf(money.balances, asset);
                return (
                  <span key={asset} className="sb-balance-value">
                    {total === null ? <Skeleton h={40} w={160} /> : formatStroops(total.toString())}
                    <small>{assetLabel(asset)}</small>
                  </span>
                );
              })
            )}
          </div>
          <div className="sb-balance-actions">
            <Link className="sb-btn sb-btn-mint" href="/app/send"><Send size={16} aria-hidden /> Send</Link>
            <button type="button" className="sb-btn sb-btn-on-navy" onClick={() => void copyAddress()} aria-live="polite">
              {copied ? <Check size={16} aria-hidden /> : <ArrowDownLeft size={16} aria-hidden />} {copied ? "Address copied" : "Receive"}
            </button>
          </div>
          <span className="sb-balance-note">Stellar Testnet · test assets only</span>
        </section>
      )}

      <section className="sb-card sb-card-flush" aria-labelledby="recent-title">
        <div className="sb-card-head">
          <h2 id="recent-title">Recent activity</h2>
          {recent.length ? <Link className="sb-link" href="/app/activity">View all</Link> : null}
        </div>
        {money.status === "loading" ? (
          <div style={{ padding: 20, display: "grid", gap: 14 }}><Skeleton h={36} /><Skeleton h={36} /></div>
        ) : money.paymentsError ? (
          <div className="sb-empty sb-empty-compact" role="status">
            <p>Payment history couldn&apos;t be loaded. Your funds are unaffected.</p>
            <button type="button" className="sb-link" onClick={() => void money.refresh()}><RefreshCw size={14} aria-hidden /> Try again</button>
          </div>
        ) : recent.length === 0 ? (
          <div className="sb-empty sb-empty-compact">
            <span className="sb-empty-icon"><Receipt size={20} aria-hidden /></span>
            <p>{account ? "Payments you send will appear here once Stellar confirms them." : "Your payments will appear here."}</p>
          </div>
        ) : (
          <ul className="sb-list">
            {recent.map((p) => {
              const meta = statusMeta(p.status);
              return (
                <li key={p.id}>
                  <Link href={`/app/activity?payment=${p.id}`} className="sb-row sb-row-button" style={{ textDecoration: "none" }}>
                    <span className="sb-row-icon"><ArrowUpRight size={17} aria-hidden /></span>
                    <span className="sb-row-main"><strong>To {short(p.destination)}</strong><span>{when(p.created_at_unix)}</span></span>
                    <span className="sb-row-end">
                      <span className="sb-amount-out">−{formatStroops(p.amount_stroops)} {assetLabel(p.asset)}</span>
                      <span className="sb-badge" data-tone={meta.tone}>{meta.label}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
