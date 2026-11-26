"use client";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CircleCheck,
  CircleDashed,
  Eye,
  Fingerprint,
  Globe2,
  KeyRound,
  Loader2,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { SiteFooter, SiteHeader, useReveal } from "@/components/marketing/site-chrome";

/**
 * Public home. Everything stated as working is live on Stellar Testnet today;
 * everything else is labelled as in development. The product demo is an
 * illustration with no amounts and no real account data.
 */
function DemoPhone() {
  return (
    <div className="mk-phone" aria-hidden>
      <div className="mk-phone-top"><span>Send money</span><span className="sb-badge" data-tone="warning">Testnet</span></div>
      <div className="mk-phone-row" style={{ marginTop: 18, borderTop: 0 }}><span>From</span><strong>Everyday account</strong></div>
      <div className="mk-phone-row"><span>To</span><span className="sb-mono">GDQ4…7KXM</span></div>
      <div className="mk-phone-row"><span>Network fee</span><span>Covered by StealthBridge</span></div>
      <div className="mk-demo-steps">
        <div className="mk-demo-step"><span className="mk-demo-icon"><ReceiptText size={22} /></span><strong>Review the exact payment</strong><small>Recipient, asset and amount, checked in your browser</small></div>
        <div className="mk-demo-step"><span className="mk-demo-icon"><Fingerprint size={22} /></span><strong>Approve with your passkey</strong><small>Face ID, fingerprint or device PIN</small></div>
        <div className="mk-demo-step" data-tone="done"><span className="mk-demo-icon"><CircleCheck size={22} /></span><strong>Confirmed on Stellar</strong><small>Completed only when the ledger proves it</small></div>
      </div>
    </div>
  );
}

const PREVIEW = {
  business: {
    title: "Confidentiality for business-critical payments.",
    body: "A workspace for teams: organization profiles, roles, payment instructions and batch planning with validation before anything is signed. Amount-confidential settlement is in development and is not live.",
    href: "/business",
    label: "Business",
    points: ["Team roles and invitations", "Batch payment planning with preflight checks", "Encrypted instruction drafts"],
  },
  send: {
    title: "A quieter way to send money home.",
    body: "A passkey smart account you control, payments you approve one by one, and a clear receipt for each. Cross-border payouts to local currency need licensed partners and aren't live yet.",
    href: "/send",
    label: "Send",
    points: ["Passkey approval for every payment", "Network fees covered", "Live status from the ledger"],
  },
} as const;

export function Home() {
  const root = useReveal();
  const [rail, setRail] = useState<"business" | "send">("business");
  const preview = PREVIEW[rail];

  return (
    <div className="mk" ref={root}>
      <SiteHeader />
      <main id="main-content">
        <div className="mk-wrap">
          <section className="mk-hero">
            <div>
              <span className="mk-kicker hero-reveal mk-hero-anim"><b>Live on Testnet</b> Passkey payments on Stellar</span>
              <h1 className="mk-h1 hero-reveal mk-hero-anim">Money moves.<br /><em>Life stays yours.</em></h1>
              <p className="mk-lead hero-reveal mk-hero-anim">
                StealthBridge gives you a smart account secured by your device&apos;s passkey. You approve every payment yourself, we cover the network fee, and nothing counts as sent until the Stellar ledger confirms it.
              </p>
              <div className="mk-hero-ctas hero-reveal mk-hero-anim">
                <Link className="sb-btn sb-btn-primary sb-btn-lg" href="/login">Open the app <ArrowRight size={17} aria-hidden /></Link>
                <Link className="sb-btn sb-btn-secondary sb-btn-lg" href="/platform">How we protect you</Link>
              </div>
              <p className="mk-hero-note hero-reveal mk-hero-anim"><ShieldCheck size={15} aria-hidden /> Testnet only. No real money moves, and confidential amounts are not yet live.</p>
            </div>
            <div className="mk-stage hero-reveal" role="img" aria-label="Illustration of the StealthBridge send flow: review, approve with passkey, confirmed on Stellar. Not real account data.">
              <span className="mk-float mk-float-a" aria-hidden><KeyRound size={15} /> Only your device can approve</span>
              <span className="mk-float mk-float-b" aria-hidden><Eye size={15} /> Ledger-verified status</span>
              <DemoPhone />
              <span className="mk-stage-caption" aria-hidden>Product illustration · not real account data</span>
            </div>
          </section>

          <section className="mk-facts mk-reveal" aria-label="What works today">
            <div className="mk-fact"><strong>Passkey smart accounts</strong><span>Created on Stellar in seconds, controlled by your device.</span></div>
            <div className="mk-fact"><strong>You approve every payment</strong><span>Signed on your device. We can&apos;t move your funds.</span></div>
            <div className="mk-fact"><strong>Fees covered</strong><span>StealthBridge pays the Stellar network fee.</span></div>
            <div className="mk-fact"><strong>Open source</strong><span>Contracts, backend, SDK and app, all public.</span></div>
          </section>
        </div>

        <section className="mk-section" aria-labelledby="how-title">
          <div className="mk-wrap">
            <div className="mk-section-head mk-reveal">
              <div><span className="mk-label">How it works</span><h2 id="how-title" className="mk-h2">Three steps. No seed phrase.</h2></div>
              <p className="mk-body">Sign in with a Stellar wallet once, create a smart account protected by a passkey, and from then on every payment is a review and a tap.</p>
            </div>
            <div className="mk-steps">
              <article className="mk-step mk-reveal">
                <h3>Create your smart account</h3>
                <p className="mk-body">Your device makes a passkey. Its public key goes into a new Stellar smart account; the private key never leaves your device.</p>
                <div className="mk-step-visual"><Fingerprint size={18} aria-hidden /> Passkey registered on this device</div>
              </article>
              <article className="mk-step mk-reveal">
                <h3>Review and approve</h3>
                <p className="mk-body">Enter a recipient and amount. Your browser checks that the request matches before your passkey signs exactly that payment, once.</p>
                <div className="mk-step-visual"><KeyRound size={18} aria-hidden /> One approval, one payment</div>
              </article>
              <article className="mk-step mk-reveal">
                <h3>See it confirmed</h3>
                <p className="mk-body">We submit it and cover the fee, then read the ledger. It&apos;s marked complete only when Stellar records the transfer you approved.</p>
                <div className="mk-step-visual"><CircleCheck size={18} aria-hidden /> Verified against the ledger</div>
              </article>
            </div>
          </div>
        </section>

        <section id="products" className="mk-section" style={{ paddingTop: 0 }} aria-labelledby="products-title">
          <div className="mk-wrap">
            <div className="mk-section-head mk-reveal">
              <div><span className="mk-label">For people and for business</span><h2 id="products-title" className="mk-h2">One account model. Two ways to use it.</h2></div>
              <div className="sb-segmented" role="group" aria-label="Product preview" style={{ justifySelf: "start" }}>
                <button type="button" aria-pressed={rail === "business"} onClick={() => setRail("business")}>Business settlement</button>
                <button type="button" aria-pressed={rail === "send"} onClick={() => setRail("send")}>Personal remittance</button>
              </div>
            </div>
            <div className={"mk-audience mk-reveal " + (rail === "business" ? "mk-audience-dark" : "mk-audience-light")} key={rail} style={{ minHeight: 0 }}>
              <span className="mk-label">{rail === "business" ? <Building2 size={16} aria-hidden /> : <UserRound size={16} aria-hidden />} StealthBridge {preview.label}</span>
              <h3>{preview.title}</h3>
              <p className="mk-body" style={{ maxWidth: 640 }}>{preview.body}</p>
              <ul>{preview.points.map((p) => <li key={p}><CircleCheck size={16} aria-hidden />{p}</li>)}</ul>
              <Link href={preview.href} className="mk-audience-go" style={{ color: "inherit" }}>Discover StealthBridge {preview.label} <ArrowUpRight size={16} aria-hidden /></Link>
            </div>
            <div className="mk-audiences" style={{ marginTop: 18 }}>
              <Link href="/send" aria-label="StealthBridge Send" className="mk-audience mk-audience-light mk-reveal" style={{ minHeight: 0 }}>
                <span className="mk-label">Personal</span>
                <h3 style={{ fontSize: 24 }}>StealthBridge Send</h3>
                <span className="mk-audience-go">Explore <ArrowRight size={16} aria-hidden /></span>
              </Link>
              <Link href="/business" aria-label="StealthBridge Business" className="mk-audience mk-audience-light mk-reveal" style={{ minHeight: 0 }}>
                <span className="mk-label">Business</span>
                <h3 style={{ fontSize: 24 }}>StealthBridge Business</h3>
                <span className="mk-audience-go">Explore <ArrowRight size={16} aria-hidden /></span>
              </Link>
            </div>
          </div>
        </section>

        <section id="principles" className="mk-section" style={{ background: "var(--sb-surface)", borderTop: "1px solid var(--sb-line)", borderBottom: "1px solid var(--sb-line)" }} aria-labelledby="principles-title">
          <div className="mk-wrap">
            <div className="mk-section-head mk-reveal">
              <div><span className="mk-label">Our approach</span><h2 id="principles-title" className="mk-h2">Privacy you can reason about.</h2></div>
              <p className="mk-body">We tell you what is protected, what is public, and what isn&apos;t built yet. A privacy claim appears here only after the mechanism behind it is implemented and verified.</p>
            </div>
            <div className="mk-capabilities">
              <div className="mk-cap-col mk-reveal">
                <h3><CircleCheck size={18} aria-hidden style={{ color: "var(--sb-success)" }} /> Working today on Testnet</h3>
                <div className="mk-cap-item"><CircleCheck size={17} aria-hidden style={{ color: "var(--sb-success)" }} /><div><strong>Self-custody by passkey</strong><span>Only your device&apos;s passkey can authorize spending from your smart account.</span></div></div>
                <div className="mk-cap-item"><CircleCheck size={17} aria-hidden style={{ color: "var(--sb-success)" }} /><div><strong>Encrypted drafts</strong><span>Payment instructions you save are encrypted before storage. This protects stored data; it doesn&apos;t make on-chain payments private.</span></div></div>
                <div className="mk-cap-item"><CircleCheck size={17} aria-hidden style={{ color: "var(--sb-success)" }} /><div><strong>Ledger-verified status</strong><span>&ldquo;Completed&rdquo; is derived from the Stellar ledger, never from a client claim.</span></div></div>
              </div>
              <div className="mk-cap-col mk-reveal">
                <h3><CircleDashed size={18} aria-hidden style={{ color: "var(--sb-warning)" }} /> In development, not live</h3>
                <div className="mk-cap-item"><Loader2 size={17} aria-hidden style={{ color: "var(--sb-ink-3)" }} /><div><strong>Confidential amounts</strong><span>Today, Stellar payments show sender, recipient, asset and amount publicly. We&apos;ll say so on every receipt until that changes.</span></div></div>
                <div className="mk-cap-item"><Globe2 size={17} aria-hidden style={{ color: "var(--sb-ink-3)" }} /><div><strong>Local-currency payouts</strong><span>Cross-border delivery to bank accounts or mobile money needs licensed partners. Routes are published for planning only.</span></div></div>
                <div className="mk-cap-item"><ShieldCheck size={17} aria-hidden style={{ color: "var(--sb-ink-3)" }} /><div><strong>Mainnet</strong><span>Real-money payments stay off until the security review and integration checks pass.</span></div></div>
              </div>
            </div>
          </div>
        </section>

        <div className="mk-wrap" style={{ paddingTop: 96 }}>
          <section className="mk-band mk-reveal" aria-labelledby="cta-title">
            <div>
              <span className="mk-label" style={{ color: "var(--sb-mint)" }}>Try it on Testnet</span>
              <h2 id="cta-title" className="mk-h2" style={{ color: "#fff" }}>The future of payments doesn&apos;t need an audience.</h2>
              <p className="mk-body">Sign in with a Stellar wallet, create a passkey account, and send a test payment in under a minute.</p>
            </div>
            <Link className="sb-btn sb-btn-mint sb-btn-lg" href="/login">Open the app <ArrowRight size={17} aria-hidden /></Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
