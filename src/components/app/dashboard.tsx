"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Building2, CircleCheck, CircleDashed, Fingerprint, Globe2, Plus, Receipt, RefreshCw, Send, ShieldCheck, UserRound } from "lucide-react";
import { countryName } from "@/lib/customer-countries";
import { loadCustomerProfile, type CustomerProfile } from "@/lib/account-profile";
import { formatStroops, assetLabel } from "@/lib/smart-account-payments";
import { EXPLORER, short, statusMeta, totalOf, useMoney, when } from "@/lib/use-money";

function Skeleton({ h = 16, w = "100%" }: { h?: number; w?: number | string }) {
  return <span className="sb-skeleton" style={{ display: "block", height: h, width: w }} aria-hidden />;
}

export function Dashboard({ address, profilesEnabled }: { address: string; profilesEnabled: boolean }) {
  const money = useMoney(address, { pollWhilePending: true });
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileState, setProfileState] = useState<"loading" | "ready" | "unavailable" | "off">(profilesEnabled ? "loading" : "off");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!profilesEnabled) return;
    const ctl = new AbortController();
    loadCustomerProfile(address, ctl.signal)
      .then((r) => { if (!ctl.signal.aborted) { setProfile(r.profile); setProfileState("ready"); } })
      .catch(() => { if (!ctl.signal.aborted) setProfileState("unavailable"); });
    return () => ctl.abort();
  }, [address, profilesEnabled, retry]);
  const personal = profile?.use_case !== "business";
  const business = profile?.use_case === "business" || profile?.use_case === "both";

  const first = profile?.display_name.trim().split(/\s+/)[0];
  const assets = money.payments?.assets ?? ["XLM"];
  const recent = money.payments?.payments.slice(0, 5) ?? [];
  const hasAccount = money.accounts.length > 0;
  const guardian = money.accounts.some((a) => a.guardian_address);

  return (
    <div className="sb-page">
      <header className="sb-page-header">
        <div>
          <span className="sb-eyebrow">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</span>
          <h1>{first ? `Good to see you, ${first}.` : "Welcome to StealthBridge."}</h1>
          <p>Your accounts, payments and security at a glance.</p>
        </div>
        <div className="sb-actions" style={{ marginTop: 0 }}>
          <Link className="sb-btn sb-btn-secondary" href="/app/accounts"><Plus size={16} aria-hidden /> New account</Link>
          <Link className="sb-btn sb-btn-primary" href="/app/send"><Send size={16} aria-hidden /> Send money</Link>
        </div>
      </header>

      {money.status === "error" ? (
        <div className="sb-alert" data-tone="danger" role="alert">
          <span>{money.error}</span>
          <button type="button" className="sb-link" onClick={() => void money.refresh()}><RefreshCw size={14} aria-hidden /> Try again</button>
        </div>
      ) : null}

      <div className="sb-split">
        <section className="sb-card sb-night" aria-labelledby="balance-title" style={{ padding: 28 }}>
          <div className="sb-card-row">
            <span id="balance-title" className="sb-stat-label">Total balance across smart accounts</span>
            <span className="sb-badge" style={{ background: "rgba(128,246,219,.12)", color: "var(--sb-mint)" }}>Stellar Testnet</span>
          </div>
          <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
            {money.status === "loading" ? <Skeleton h={44} w="60%" /> : !hasAccount ? (
              <div>
                <div className="sb-stat-value" style={{ color: "#fff" }}>—</div>
                <p className="sb-muted" style={{ marginTop: 8 }}>Create a passkey smart account to hold and send funds.</p>
              </div>
            ) : money.balanceError ? (
              <p className="sb-muted">Balances couldn&apos;t be read from Stellar right now.</p>
            ) : (
              assets.map((asset) => {
                const total = totalOf(money.balances, asset);
                return (
                  <div key={asset} className="sb-stat">
                    <span className="sb-stat-value" style={{ color: "#fff" }}>
                      {total === null ? <Skeleton h={40} w={180} /> : formatStroops(total.toString())}
                      <small>{assetLabel(asset)}</small>
                    </span>
                  </div>
                );
              })
            )}
            <div className="sb-actions" style={{ marginTop: 4 }}>
              <Link className="sb-btn sb-btn-mint sb-btn-sm" href="/app/send"><ArrowUpRight size={15} aria-hidden /> Send</Link>
              <Link className="sb-btn sb-btn-sm" href="/app/accounts" style={{ background: "rgba(255,255,255,.08)", color: "#fff", borderColor: "rgba(255,255,255,.16)" }}>
                <ArrowDownLeft size={15} aria-hidden /> Add funds
              </Link>
            </div>
          </div>
        </section>

        <section className="sb-card" aria-labelledby="security-title">
          <div className="sb-card-row" style={{ marginBottom: 14 }}>
            <h2 id="security-title" className="sb-section-title" style={{ fontSize: 16 }}>Account security</h2>
            <ShieldCheck size={18} aria-hidden style={{ color: "var(--sb-brand)" }} />
          </div>
          {money.status === "loading" ? <div style={{ display: "grid", gap: 10 }}><Skeleton /><Skeleton /><Skeleton w="70%" /></div> : (
            <ul className="sb-checklist">
              <li data-state="done"><CircleCheck size={17} aria-hidden /><span><strong>Wallet sign-in</strong>Verified for {short(address, 4)}
                <details className="sb-reveal-id"><summary>View my account ID</summary><code className="sb-mono">{address}</code>
                  <small>Your public Stellar account. It isn&apos;t a recovery phrase or signing key; share it only when you choose to.</small></details></span></li>
              <li data-state={hasAccount ? "done" : "todo"}>{hasAccount ? <CircleCheck size={17} aria-hidden /> : <CircleDashed size={17} aria-hidden />}
                <span><strong>Passkey smart account</strong>{hasAccount ? `${money.accounts.length} active` : "Not created yet"}</span></li>
              <li data-state={guardian ? "done" : "todo"}>{guardian ? <CircleCheck size={17} aria-hidden /> : <CircleDashed size={17} aria-hidden />}
                <span><strong>Recovery guardian</strong>{guardian ? "Your wallet can recover access" : "Add one when you create an account"}</span></li>
            </ul>
          )}
          {profileState === "ready" && !profile ? (
            <Link href="/app/settings" className="sb-alert" style={{ marginTop: 16, textDecoration: "none" }}>
              <UserRound size={16} aria-hidden /><span><strong>Personalize your account.</strong> Add a name and country. No payment details needed.</span>
            </Link>
          ) : null}
          {profileState === "ready" && profile ? (
            <div className="sb-card-row" style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--sb-line)", alignItems: "center" }}>
              <span className="sb-subtle" style={{ fontSize: 13 }}>{profile.residence_country ? "Based in " + countryName(profile.residence_country) : "No country selected"}</span>
              <Link className="sb-link" style={{ fontSize: 13 }} href="/app/settings">Edit preferences <ArrowRight size={13} aria-hidden /></Link>
              <span className="sb-subtle" style={{ flexBasis: "100%" }}>Your profile is not identity verification.</span>
            </div>
          ) : null}
          {profileState === "unavailable" ? (
            <div className="sb-alert" role="alert" style={{ marginTop: 16 }}>
              <span>We couldn&apos;t load your saved preferences. Your money and account access are unaffected.{" "}
                <button type="button" className="sb-link" onClick={() => { setProfileState("loading"); setRetry((x) => x + 1); }}>Try again</button></span>
            </div>
          ) : null}
        </section>
      </div>

      <section className="sb-card sb-card-flush" aria-labelledby="recent-title">
        <div className="sb-card-head">
          <h2 id="recent-title">Recent activity</h2>
          <Link className="sb-link" href="/app/activity">View all</Link>
        </div>
        {money.status === "loading" ? (
          <div style={{ padding: 20, display: "grid", gap: 14 }}><Skeleton h={38} /><Skeleton h={38} /><Skeleton h={38} /></div>
        ) : money.paymentsError ? (
          <div className="sb-empty" role="status">
            <h3>Payment history unavailable</h3>
            <p>We couldn&apos;t load your payments right now. Your funds are unaffected.</p>
            <button type="button" className="sb-btn sb-btn-secondary sb-btn-sm" onClick={() => void money.refresh()}><RefreshCw size={14} aria-hidden /> Try again</button>
          </div>
        ) : recent.length === 0 ? (
          <div className="sb-empty">
            <span className="sb-empty-icon"><Receipt size={22} aria-hidden /></span>
            <h3>No payments yet</h3>
            <p>{hasAccount ? "Payments you approve with your passkey appear here once Stellar confirms them." : "Create a smart account, add funds, then send your first payment."}</p>
            <Link className="sb-btn sb-btn-secondary sb-btn-sm" href={hasAccount ? "/app/send" : "/app/accounts"}>
              {hasAccount ? <Send size={14} aria-hidden /> : <Fingerprint size={14} aria-hidden />} {hasAccount ? "Send a payment" : "Create a smart account"}
            </Link>
          </div>
        ) : (
          <ul className="sb-list">
            {recent.map((p) => {
              const meta = statusMeta(p.status);
              return (
                <li key={p.id}>
                  <Link href={`/app/activity?payment=${p.id}`} className="sb-row sb-row-button" style={{ textDecoration: "none" }}>
                    <span className="sb-row-icon"><ArrowUpRight size={18} aria-hidden /></span>
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

      <section className="sb-grid-2" aria-label="Shortcuts">
        {personal || !profile ? (
          <Link href="/app/routes" className="sb-card sb-row-button" style={{ display: "flex", gap: 14, alignItems: "center", textDecoration: "none" }}>
            <span className="sb-row-icon"><Globe2 size={18} aria-hidden /></span>
            <span className="sb-row-main"><strong>Plan a cross-border transfer</strong><span>Explore published routes and save an encrypted draft</span></span>
            <ArrowRight size={16} aria-hidden style={{ color: "var(--sb-ink-3)" }} />
          </Link>
        ) : null}
        {business || !profile ? (
          <Link href="/app/business" className="sb-card sb-row-button" style={{ display: "flex", gap: 14, alignItems: "center", textDecoration: "none" }}>
            <span className="sb-row-icon"><Building2 size={18} aria-hidden /></span>
            <span className="sb-row-main"><strong>Manage business payments</strong><span>Onboarding, team access, single and batch payments</span></span>
            <ArrowRight size={16} aria-hidden style={{ color: "var(--sb-ink-3)" }} />
          </Link>
        ) : null}
      </section>

      {hasAccount ? (
        <section className="sb-section" aria-labelledby="accounts-title">
          <div className="sb-section-head">
            <h2 id="accounts-title" className="sb-section-title">Your smart accounts</h2>
            <Link className="sb-link" href="/app/accounts">Manage</Link>
          </div>
          <div className="sb-grid-3">
            {money.accounts.map((a) => {
              const bal = money.balances?.find((b) => b.contract_address === a.contract_address)?.balances ?? [];
              return (
                <article key={a.contract_address} className="sb-card">
                  <div className="sb-card-row">
                    <h3>{a.label}</h3>
                    <span className="sb-badge" data-tone="success">Active</span>
                  </div>
                  <p className="sb-mono" style={{ margin: "8px 0 14px", color: "var(--sb-ink-3)" }}>{short(a.contract_address)}</p>
                  {bal.length === 0 ? <span className="sb-subtle">Balance loading…</span> : bal.map((b) => (
                    <div key={b.asset} className="sb-num" style={{ fontSize: 20, fontWeight: 520 }}>
                      {b.balance_stroops === null ? "—" : formatStroops(b.balance_stroops)} <span className="sb-subtle">{assetLabel(b.asset)}</span>
                    </div>
                  ))}
                  <a className="sb-link" style={{ marginTop: 12, fontSize: 13 }} href={`${EXPLORER}/contract/${a.contract_address}`} target="_blank" rel="noreferrer">
                    View on Stellar <ArrowUpRight size={12} aria-hidden />
                  </a>
                </article>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
