import type { Metadata } from "next";
import { CircleCheck, CircleDashed, CircleX, Eye, EyeOff, FlaskConical, LockKeyhole } from "lucide-react";
import { requireWalletIdentity } from "@/lib/auth-server";
import { PageHeader } from "@/components/app/page-header";
import { BUSINESS_RAIL, MECHANISMS, PERSONAL_RAIL, railAvailable } from "@/lib/privacy-capabilities";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Privacy centre — StealthBridge", robots: { index: false, follow: false } };

const STATUS = {
  "live-testnet": { label: "Live on Testnet", tone: "success" },
  "research-no-go": { label: "Research only · not available", tone: "warning" },
  "not-available": { label: "Not available", tone: "neutral" },
} as const;

export default async function PrivacyCentre() {
  await requireWalletIdentity();
  return (
    <div className="sb-page">
      <PageHeader
        eyebrow="Account"
        title="Privacy centre"
        description="What each StealthBridge mechanism protects, what stays public on Stellar, and which privacy features are actually available."
      />

      <div className="sb-alert" data-tone="warning" role="note">
        <EyeOff size={17} aria-hidden />
        <span><strong>Your payments today are public on Stellar.</strong> Passkey payments show sender, recipient, asset, amount and time to anyone. No StealthBridge payment is private yet.</span>
      </div>

      <section className="sb-section" aria-labelledby="mechanisms-title">
        <h2 id="mechanisms-title" className="sb-section-title">Mechanisms</h2>
        <div className="sb-grid-2">
          {MECHANISMS.map((m) => {
            const s = STATUS[m.status];
            const available = railAvailable(m.id);
            return (
              <article key={m.id} className="sb-card" aria-label={m.name}>
                <div className="sb-card-row" style={{ alignItems: "center" }}>
                  <h3>{m.name}</h3>
                  <span className="sb-badge" data-tone={s.tone}>{s.label}</span>
                </div>
                <dl className="sb-details" style={{ marginTop: 14 }}>
                  <dt><LockKeyhole size={13} aria-hidden /> Protects</dt><dd>{m.protects}</dd>
                  <dt><Eye size={13} aria-hidden /> Public</dt><dd>{m.public}</dd>
                </dl>
                {m.verdict ? (
                  <p className="sb-subtle" style={{ marginTop: 12 }}>
                    Release gate: <strong>{m.verdict}</strong>{available ? "" : ". This feature cannot be switched on in the app."}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>

      <section className="sb-card" aria-labelledby="personal-title">
        <div className="sb-card-row" style={{ alignItems: "center" }}>
          <h2 id="personal-title" className="sb-section-title" style={{ fontSize: 17 }}>Personal shielded pool: research status</h2>
          <FlaskConical size={18} aria-hidden style={{ color: "var(--sb-brand)" }} />
        </div>
        <p className="sb-muted" style={{ marginTop: 6 }}>
          Integration target: {PERSONAL_RAIL.upstream} (Stellar Testnet, third-party pool). Verified independently by StealthBridge:
        </p>
        <ul className="sb-checklist" style={{ marginTop: 14 }}>
          {PERSONAL_RAIL.verified.map((v) => <li key={v} data-state="done"><CircleCheck size={16} aria-hidden /><span>{v}</span></li>)}
          {PERSONAL_RAIL.blockers.map((b) => <li key={b} data-state="todo"><CircleDashed size={16} aria-hidden /><span><strong>Blocker</strong>{b}</span></li>)}
        </ul>
        <p className="sb-subtle" style={{ marginTop: 14 }}>
          Pinned code <span className="sb-mono">{PERSONAL_RAIL.poolWasmSha256.slice(0, 12)}…</span> from commit <span className="sb-mono">{PERSONAL_RAIL.deploymentCommit.slice(0, 8)}</span>.
          Even when available, deposits and withdrawals stay public; only transfers inside the pool are hidden.
        </p>
      </section>

      <section className="sb-card" aria-labelledby="business-title">
        <h2 id="business-title" className="sb-section-title" style={{ fontSize: 17 }}>Business confidential token: not available</h2>
        <p className="sb-muted" style={{ marginTop: 6 }}>
          Integration target: {BUSINESS_RAIL.upstream}. It would hide amounts and balances, never who pays whom.
        </p>
        <ul className="sb-checklist" style={{ marginTop: 14 }}>
          {BUSINESS_RAIL.blockers.map((b) => <li key={b} data-state="unavailable"><CircleX size={16} aria-hidden /><span>{b}</span></li>)}
        </ul>
      </section>
    </div>
  );
}
