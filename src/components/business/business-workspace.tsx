"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Building2, CheckCircle2, Clock3, FileSpreadsheet, LockKeyhole, RefreshCw, SquarePen, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { OrganizationReference } from "@/components/organization-reference";
import { PendingBusinessActions } from "@/components/pending-business-actions";
import { TeamInvitations } from "@/components/team-invitations";
import { getAccountDirectory, type AccountDirectory } from "@/lib/account-directory";
import {
  loadBusinessOnboarding, registerBusinessOnboarding, validBusinessApplicationName, type BusinessOnboardingEnvelope,
} from "@/lib/business-onboarding";

/** Each source is shown only when it answered; a failed source is reported, never guessed. */
type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; onboarding: BusinessOnboardingEnvelope | null; directory: AccountDirectory | null };

const MAX_PENDING = 3;

/**
 * The business workspace. Every state comes from the backend: pending applications
 * (unreviewed registrations) and active memberships (not payment authority).
 * Money movement is never offered here.
 */
export function BusinessWorkspace({ address, invitationsEnabled }: { address: string; invitationsEnabled: boolean }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>({ status: "loading" });
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const ctl = new AbortController();
    setState({ status: "loading" });
    void Promise.allSettled([loadBusinessOnboarding(address, ctl.signal), getAccountDirectory(address, ctl.signal)])
      .then(([a, d]) => {
        if (ctl.signal.aborted) return;
        const onboarding = a.status === "fulfilled" ? a.value : null;
        const directory = d.status === "fulfilled" ? d.value : null;
        setState(onboarding || directory ? { status: "ready", onboarding, directory } : { status: "error" });
      });
    return () => ctl.abort();
  }, [address, revision]);

  const refresh = () => setRevision((n) => n + 1);
  const header = (
    <PageHeader
      title="Business workspace"
      actions={
        <button type="button" className="sb-btn sb-btn-secondary sb-btn-sm" onClick={refresh} disabled={state.status === "loading"} aria-label="Refresh business records">
          <RefreshCw size={14} aria-hidden /> Refresh
        </button>
      }
    />
  );

  const invites = invitationsEnabled ? <div className="sb-legacy"><TeamInvitations address={address} /></div> : null;
  if (state.status === "loading") {
    return (
      <div className="sb-page">
        {header}
        <div className="sb-card" role="status" aria-label="Loading your business records">
          <span className="sb-skeleton" style={{ display: "block", height: 20, width: "40%" }} />
          <span className="sb-skeleton" style={{ display: "block", height: 14, width: "70%", marginTop: 14 }} />
        </div>
        {invites}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="sb-page">
        {header}
        <div className="sb-alert" data-tone="danger" role="alert">
          <span><strong>We couldn&apos;t load your business records.</strong> Nothing was changed, and we won&apos;t guess what you hold.</span>
          <button type="button" className="sb-link" onClick={refresh}><RefreshCw size={14} aria-hidden /> Try again</button>
        </div>
        {invites}
      </div>
    );
  }

  const { onboarding, directory } = state;
  const orgs = directory?.organizations ?? [];
  const apps = onboarding?.applications ?? [];
  const canRegister = onboarding !== null && apps.length < MAX_PENDING && !onboarding.has_more;
  const active = orgs.find((o) => o.id === selected) ?? orgs[0];
  // "New" only when both sources answered and both are empty.
  const isNew = onboarding !== null && directory !== null && orgs.length === 0 && apps.length === 0 && !onboarding.has_more;

  return (
    <div className="sb-page">
      {header}
      {!directory ? (
        <div className="sb-alert" data-tone="danger" role="alert"><span>We couldn&apos;t load your organization memberships. Nothing was assumed.</span></div>
      ) : null}
      {!onboarding ? (
        <div className="sb-alert" data-tone="danger" role="alert"><span>We couldn&apos;t load your business applications. Nothing was changed.</span></div>
      ) : null}
      {notice ? <p className="sb-alert" data-tone="success" role="status"><CheckCircle2 size={16} aria-hidden /> {notice}</p> : null}

      {active ? (
        <section className="sb-card sb-org" aria-labelledby="org-title">
          <div className="sb-org-head">
            <span className="sb-org-icon"><Building2 size={20} aria-hidden /></span>
            <div className="sb-org-name">
              <h2 id="org-title">{active.display_name}</h2>
              <span className="sb-subtle">Your role: <strong style={{ color: "var(--sb-ink)" }}>{active.role}</strong></span>
            </div>
            <span className="sb-badge" data-tone="success"><CheckCircle2 size={12} aria-hidden /> Current membership</span>
            {orgs.length > 1 ? (
              <label className="sb-org-switch">
                <span className="sb-sr-only">Organization</span>
                <select className="sb-input" value={active.id} onChange={(e) => setSelected(e.target.value)} aria-label="Switch organization">
                  {orgs.map((o) => <option key={o.id} value={o.id}>{o.display_name}</option>)}
                </select>
              </label>
            ) : null}
          </div>
          <div className="sb-org-grid">
            <div className="sb-org-cell">
              <h3><UsersRound size={15} aria-hidden /> People</h3>
              {["owner", "admin"].includes(active.role) ? (
                <Link className="sb-link" href={`/app/business/${active.id}`}>Team and invitations <ArrowRight size={14} aria-hidden /></Link>
              ) : (
                <p className="sb-subtle">Owners and admins manage the team.</p>
              )}
            </div>
            <div className="sb-org-cell">
              <h3><SquarePen size={15} aria-hidden /> Payments</h3>
              <Link className="sb-link" href="/app/business/payments">Prepare one payment <ArrowRight size={14} aria-hidden /></Link>
              <Link className="sb-link" href="/app/business/batch">Plan a batch <FileSpreadsheet size={14} aria-hidden /></Link>
            </div>
            <div className="sb-org-cell">
              <h3><LockKeyhole size={15} aria-hidden /> Money movement</h3>
              <p className="sb-subtle">Off. Membership doesn&apos;t authorize payments.</p>
            </div>
          </div>
          <OrganizationReference id={active.id} />
          {directory?.has_more ? <p className="sb-subtle">Showing your first 25 organizations.</p> : null}
        </section>
      ) : null}

      {apps.length > 0 ? (
        <section className="sb-section" aria-labelledby="apps-title">
          <h2 id="apps-title" className="sb-section-title">Awaiting review</h2>
          {apps.map((app) => (
            <article key={app.id} className="sb-card sb-org" aria-label={app.display_name}>
              <div className="sb-org-head">
                <span className="sb-org-icon" data-tone="warning"><Clock3 size={20} aria-hidden /></span>
                <div className="sb-org-name">
                  <h3>{app.display_name}</h3>
                  <span className="sb-subtle">Registered by you ({app.role})</span>
                </div>
                <span className="sb-badge" data-tone="warning">Awaiting review</span>
              </div>
              <p className="sb-muted" style={{ margin: 0 }}>
                StealthBridge hasn&apos;t verified this business yet. Registering doesn&apos;t establish legal identity or approve payments; those stay off until review and activation.
              </p>
              <div className="sb-org-actions">
                <Link className="sb-btn sb-btn-secondary sb-btn-sm" href={`/app/business/${app.id}`}>Review application and team</Link>
                <PendingBusinessActions address={address} application={app} onChanged={(m) => { setNotice(m); refresh(); }} />
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {isNew ? (
        <section className="sb-card sb-start" aria-labelledby="start-title">
          <span className="sb-org-icon"><Building2 size={22} aria-hidden /></span>
          <div>
            <h2 id="start-title">Set up your business</h2>
            <p className="sb-muted">You haven&apos;t registered a business workspace yet. Start with its name; we review every business before anything can be paid.</p>
          </div>
          <RegisterBusiness address={address} onDone={(name) => { setNotice(`Application registered for ${name}.`); refresh(); }} />
        </section>
      ) : canRegister ? (
        <details className="sb-card sb-disclosure">
          <summary>Register another business</summary>
          <RegisterBusiness address={address} onDone={(name) => { setNotice(`Application registered for ${name}.`); refresh(); }} />
        </details>
      ) : null}

      {invites}
    </div>
  );
}

function RegisterBusiness({ address, onDone }: { address: string; onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !validBusinessApplicationName(name)) return;
    setSaving(true); setError("");
    try {
      await registerBusinessOnboarding(address, name);
      const saved = name.trim();
      setName("");
      onDone(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to register this business.");
    } finally { setSaving(false); }
  }
  return (
    <form className="sb-register" onSubmit={(e) => void submit(e)}>
      <label className="sb-field">
        <span>Business or organization name</span>
        <input className="sb-input" name="businessName" autoComplete="organization" maxLength={120} required value={name}
          onChange={(e) => { setName(e.target.value); setError(""); }} />
      </label>
      <button type="submit" className="sb-btn sb-btn-primary" disabled={saving || !validBusinessApplicationName(name)}>
        {saving ? "Registering…" : "Register business application"}
      </button>
      {error ? <p className="sb-field-error" role="alert">{error}</p> : null}
    </form>
  );
}
