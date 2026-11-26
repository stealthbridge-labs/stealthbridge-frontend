"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, ArrowUpRight, BadgeCheck, ChevronDown, Coins, Eye, EyeOff, Fingerprint, Globe2, KeyRound,
  Layers3, LockKeyhole, Menu, QrCode, Receipt, Repeat2, ShieldCheck, Sparkles, X,
} from "lucide-react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";
import { Brand } from "./brand";
import { Button } from "./ui/button";

/**
 * Public home. Statements of fact describe what runs on Stellar Testnet today;
 * everything else is labelled "in development" or "planned". Illustrations carry
 * no amounts, balances or real account data.
 *
 * Motion (GSAP): a one-time hero intro; ambient hero loops that pause off-screen;
 * a few scroll-triggered reveals that play once and only below the fold; a
 * sticky "how it works" device that follows the step in view; a one-time
 * concealment sequence; a scrubbed roadmap line. Content is fully visible
 * without JavaScript and under prefers-reduced-motion (no GSAP runs at all).
 */

const STEPS = [
  { Icon: Fingerprint, title: "Create a passkey account", body: "Your device creates a passkey. Its public key becomes the owner of a new Soroban smart account (a C… contract address). The private key never leaves your device, and there's no seed phrase to lose.", screen: "Passkey registered", hint: "Face ID, fingerprint or device PIN" },
  { Icon: KeyRound, title: "Review, then approve", body: "Enter a recipient and amount. Your browser checks the Soroban authorization matches before your passkey signs exactly that payment, once. StealthBridge sponsors the fee but can't move your money.", screen: "Approve with your passkey", hint: "One approval, one payment" },
  { Icon: BadgeCheck, title: "Confirmed by the ledger", body: "We submit the transaction, then read Stellar. A payment is complete only when the ledger records the token transfer you approved, with a receipt you can check on a block explorer.", screen: "Confirmed on Stellar", hint: "Verified against the ledger" },
] as const;

const LEDGER_FIELDS = [
  ["Sender", "Your smart account address", "Hidden inside the pool"],
  ["Recipient", "Their Stellar address", "An encrypted note only they can open"],
  ["Amount", "Exact value", "Hidden"],
  ["Link between them", "Anyone can follow it", "Broken by zero-knowledge proofs"],
] as const;

const STELLAR = [
  { Icon: Layers3, title: "Soroban smart accounts", body: "Each customer gets their own contract account whose __check_auth enforces the rules: not a shared custodial wallet." },
  { Icon: Fingerprint, title: "Passkeys verified on-chain", body: "WebAuthn P-256 signatures are checked by the account contract with Stellar's secp256r1 host function." },
  { Icon: Coins, title: "Stellar Asset Contracts", body: "Balances and transfers use the network's native token contracts (XLM today; USDC next), not an internal ledger." },
  { Icon: Receipt, title: "Fees sponsored, never custody", body: "A relayer pays network fees and submits your signed transaction. It has no power to authorize a payment." },
] as const;

const ROADMAP = [
  { Icon: EyeOff, title: "Private payments", body: "A shielded pool integrating the open-source Nethermind stellar-private-payments design (Groth16 on BN254, Poseidon).", state: "Building" },
  { Icon: Coins, title: "USDC & trustlines", body: "Hold and send Testnet USDC from smart accounts through its Stellar Asset Contract.", state: "Building" },
  { Icon: Repeat2, title: "Path payments", body: "Send one asset and deliver another through Stellar's DEX, with a live quote before you approve.", state: "Planned" },
  { Icon: Globe2, title: "Anchors", body: "Deposit and withdraw through Stellar anchors (SEP-10, SEP-24, SEP-31).", state: "Planned" },
  { Icon: QrCode, title: "Payment requests", body: "Share a link or QR code; incoming payments confirmed by the ledger.", state: "Planned" },
] as const;

const FAQ = [
  ["Can I send money with StealthBridge today?", "Yes, on Stellar Testnet. You can create a passkey smart account and send test assets. Testnet tokens have no value; real-money payments stay off until security reviews and integration checks pass."],
  ["Are my payments private today?", "Not on-chain. A standard Stellar payment shows sender, recipient, asset and amount publicly, and every StealthBridge receipt says so. Payment drafts you save are encrypted before storage. On-chain privacy arrives with the private payments pool, which is in development."],
  ["Who controls my money?", "You do. Only your device's passkey can authorize a payment from your smart account. StealthBridge sponsors fees and submits transactions, but it cannot sign for you."],
  ["Is it open source?", "Yes. Contracts, backend, SDK and app are open source. The TypeScript SDK is published on npm as @stealthbridge/sdk."],
] as const;

export function Home() {
  const root = useRef<HTMLDivElement>(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [rail, setRail] = useState<"business" | "send">("business");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!mobileMenu) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileMenu(false); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileMenu]);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // 1. Hero: one-time intro, never scroll-dependent.
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".site-header", { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.7 })
        .fromTo(".hero-reveal", { opacity: 0, y: 40, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", stagger: 0.1, duration: 0.95 }, -0.35)
        .fromTo(".routing-board", { opacity: 0, y: 40, rotateY: 10, scale: 0.95 }, { opacity: 1, y: 0, rotateY: -5, scale: 1, duration: 1.2, ease: "power4.out" }, -0.75)
        .fromTo(".floating-receipt", { opacity: 0, x: -28, y: 16 }, { opacity: 1, x: 0, y: 0, duration: 0.9 }, -0.3);

      // Ambient loops only while the hero is on screen.
      const ambient = gsap.timeline({ paused: true });
      ambient.to(".ambient-halo", { scale: 1.14, opacity: 0.7, duration: 4.7, repeat: -1, yoyo: true, ease: "sine.inOut" }, 0)
        .to(".routing-board", { y: -10, duration: 5.5, repeat: -1, yoyo: true, ease: "sine.inOut" }, 0)
        .to(".floating-receipt", { y: -14, duration: 3.8, repeat: -1, yoyo: true, ease: "sine.inOut" }, 0);
      ScrollTrigger.create({ trigger: ".hero", start: "top bottom", end: "bottom top", onToggle: (self) => (self.isActive ? ambient.play() : ambient.pause()) });

      // 2. A few chosen reveals: once, below the fold only, hidden only right before they run.
      gsap.utils.toArray<HTMLElement>(".lp-reveal").forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight) return;
        const items = el.querySelectorAll<HTMLElement>(".lp-reveal-item");
        const targets: HTMLElement[] = items.length ? Array.from(items) : [el];
        ScrollTrigger.create({
          trigger: el, start: "top 88%", once: true,
          onEnter: () => gsap.fromTo(targets, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out", stagger: 0.09, clearProps: "transform,opacity" }),
        });
      });

      // 3. "How it works": the sticky device follows whichever step is in view.
      gsap.utils.toArray<HTMLElement>(".lp-step").forEach((el, index) => {
        ScrollTrigger.create({ trigger: el, start: "top 62%", end: "bottom 62%", onToggle: (self) => { if (self.isActive) setStep(index); } });
      });
      gsap.fromTo(".lp-how-progress span", { scaleY: 0 }, { scaleY: 1, ease: "none", scrollTrigger: { trigger: ".lp-how-steps", start: "top 62%", end: "bottom 62%", scrub: true } });

      // 4. Privacy goal card: fields conceal one by one, once.
      const fields = gsap.utils.toArray<HTMLElement>(".lp-ledger-goal .lp-field");
      if (fields.length && fields[0].getBoundingClientRect().top > window.innerHeight) {
        fields.forEach((f) => f.setAttribute("data-masked", "false"));
        ScrollTrigger.create({
          trigger: ".lp-ledger-goal", start: "top 70%", once: true,
          onEnter: () => fields.forEach((f, i) => gsap.delayedCall(0.22 * i + 0.2, () => f.setAttribute("data-masked", "true"))),
        });
      }

      // 5. Roadmap line draws with scroll (scrubbed: linear, no duration).
      gsap.fromTo(".lp-road-line span", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { trigger: ".lp-road-list", start: "top 85%", end: "bottom 60%", scrub: true } });
    }, root);
    // Browser-test observable count: never expose wallet or network state.
    document.documentElement.dataset.stealthbridgeGsapTriggers = String(ScrollTrigger.getAll().length);
    return () => {
      ctx.revert();
      document.querySelectorAll<HTMLElement>(".lp-ledger-goal .lp-field").forEach((f) => f.setAttribute("data-masked", "true"));
      document.documentElement.dataset.stealthbridgeGsapTriggers = String(ScrollTrigger.getAll().length);
    };
  }, []);

  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const item = root.current.querySelector(".product-feature");
    if (!item) return;
    gsap.fromTo(item, { opacity: 0.6, y: 10, filter: "blur(2px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.45, ease: "power2.out", overwrite: true });
  }, [rail]);

  const current = STEPS[step];
  return <div ref={root} className="page-frame">
    <div className="noise" aria-hidden="true" />
    <header className="site-header container-wide"><Brand />
      <nav id="stealthbridge-site-navigation" className={mobileMenu ? "nav-links nav-open" : "nav-links"} aria-label="Main navigation">
        <Link href="/platform" onClick={() => setMobileMenu(false)}>Privacy & trust</Link>
        <Link href="/business" onClick={() => setMobileMenu(false)}>For business</Link>
        <Link href="/send" onClick={() => setMobileMenu(false)}>For people</Link>
        <a href="#principles" onClick={() => setMobileMenu(false)}>Our approach</a>
      </nav>
      <div className="header-actions"><span className="network-chip"><i /> Live on Stellar Testnet</span>
        <Link className="nav-cta" href="/login">Sign in <ArrowUpRight size={15} /></Link></div>
      <button type="button" className="mobile-toggle" aria-controls="stealthbridge-site-navigation" aria-label={mobileMenu ? "Close navigation" : "Open navigation"} aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}>{mobileMenu ? <X /> : <Menu />}</button>
    </header>

    <main id="main-content">
      <section className="hero container-wide">
        <div className="hero-copy">
          <div className="hero-reveal kicker"><span className="signal-dot" /> Passkey payments on Stellar <span className="kicker-rule" /></div>
          <h1 className="hero-reveal">Money moves.<br /><span className="quiet-title">Life stays yours.</span></h1>
          <p className="hero-reveal hero-lead">A Stellar smart account secured by your device&apos;s passkey. You approve every payment yourself, we sponsor the network fee, and nothing counts as sent until the ledger confirms it.</p>
          <div className="hero-reveal hero-buttons">
            <Button size="lg" asChild><Link href="/business">StealthBridge Business <ArrowUpRight size={17} /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/send">StealthBridge Send <ArrowRight size={17} /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/login">Open the app <ArrowRight size={17} /></Link></Button>
          </div>
          <div className="hero-reveal hero-note"><ShieldCheck size={16} /><span>Stellar Testnet only: no real money moves. On-chain privacy is in development.</span></div>
        </div>
        <div className="hero-art" role="group" aria-label="Illustration of the StealthBridge payment journey, not real account data">
          <div className="ambient-halo" /><div className="orbital orbital-one" aria-hidden="true" /><div className="orbital orbital-two" aria-hidden="true" />
          <div className="routing-board">
            <div className="board-top"><div><span className="board-eyebrow">YOUR MONEY, YOUR DEVICE</span>
              <strong>One clear journey, start to finish.</strong></div><span className="board-live"><span /> Live on Testnet</span></div>
            <div className="consumer-journey">
              <div className="consumer-journey-hero"><span>01 · YOUR ACCOUNT</span><h3>Closer, even across borders.</h3>
                <p>A smart account only your passkey can spend from.</p></div>
              <div className="consumer-journey-step"><span className="consumer-step-symbol"><Fingerprint size={21} /></span><div><strong>Approve on your device</strong><small>Face ID, fingerprint or PIN</small></div><ArrowRight size={19} /></div>
              <div className="consumer-journey-step"><span className="consumer-step-symbol"><ShieldCheck size={21} /></span><div><strong>Know before you approve</strong><small>Recipient, amount and fee, checked in your browser</small></div><ArrowRight size={19} /></div>
              <div className="consumer-journey-step"><span className="consumer-step-symbol"><BadgeCheck size={21} /></span><div><strong>Confirmed by the ledger</strong><small>Complete only when Stellar records it</small></div><ArrowRight size={19} /></div>
            </div>
            <div className="board-footer"><span>Illustration · not real account data</span><Link href="/login">Open the app <ArrowRight size={14} /></Link></div>
          </div>
          <div className="floating-receipt"><div className="floating-icon"><ShieldCheck size={17} /></div><div><span>No imaginary delivery</span><strong>Ledger-verified</strong></div><span className="receipt-tag">Trust</span></div>
        </div>
      </section>

      <section id="infrastructure" className="border-y border-sb-line bg-sb-deep/80" aria-label="Working today on Stellar Testnet">
        <div className="container-wide flex flex-wrap items-center gap-x-10 gap-y-4 py-7">
          <span className="inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.14em] text-sb-mint"><span className="signal-dot" /> Working today on Testnet</span>
          <ul className="flex flex-1 flex-wrap justify-between gap-x-8 gap-y-3 text-[13px] font-semibold text-sb-muted [&_li]:inline-flex [&_li]:items-center [&_li]:gap-2 [&_svg]:text-sb-mint">
            <li><Fingerprint size={16} aria-hidden /> Passkey smart accounts</li>
            <li><KeyRound size={16} aria-hidden /> Device-approved payments</li>
            <li><Coins size={16} aria-hidden /> Sponsored network fees</li>
            <li><Receipt size={16} aria-hidden /> Ledger-verified receipts</li>
            <li><LockKeyhole size={16} aria-hidden /> Encrypted payment drafts</li>
          </ul>
        </div>
      </section>

      <section id="how" className="container-wide py-28 max-md:py-20" aria-labelledby="how-title">
        <div className="section-heading lp-reveal"><div><span className="section-index lp-reveal-item">How it works</span><h2 id="how-title" className="lp-reveal-item">Three steps.<br />No seed phrase.</h2></div>
          <p className="lp-reveal-item">Sign in with a Stellar wallet once. From then on, every payment is a review and a tap on your own device.</p></div>
        <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start gap-16 max-lg:grid-cols-1 max-lg:gap-10">
          <div className="sticky top-28 max-lg:static max-lg:hidden" aria-hidden="true">
            <div className="relative mx-auto flex aspect-[9/14] w-full max-w-[340px] flex-col rounded-[34px] border border-sb-mint/25 bg-gradient-to-b from-sb-raised to-sb-deep p-6 shadow-[0_40px_90px_-40px_rgba(0,0,0,.85),0_0_0_8px_rgba(128,246,219,.04)]">
              <div className="flex items-center justify-between text-xs font-semibold text-sb-muted"><span>StealthBridge</span><span className="rounded-full bg-sb-amber/15 px-2.5 py-1 text-[11px] font-bold text-sb-amber">Testnet</span></div>
              <div className="my-auto grid animate-[sb-enter_420ms_var(--ease-sb-enter)_both] justify-items-center gap-3 text-center motion-reduce:animate-none" key={step}>
                <span className="grid size-20 place-items-center rounded-[26px] border border-sb-mint/35 bg-sb-mint/10 text-sb-mint shadow-[0_0_60px_-12px_rgba(128,246,219,.45)]"><current.Icon size={30} strokeWidth={1.6} /></span>
                <strong className="mt-2 text-lg tracking-tight text-sb-ink">{current.screen}</strong>
                <small className="text-[13px] text-sb-subtle">{current.hint}</small>
              </div>
              <div className="flex justify-center gap-2">{STEPS.map((s, i) => <span key={s.title} data-active={i === step} className="h-1.5 w-1.5 rounded-full bg-sb-line transition-[width,background-color] duration-300 ease-sb-enter data-[active=true]:w-6 data-[active=true]:bg-sb-mint" />)}</div>
              <span className="mt-4 text-center text-[11px] uppercase tracking-[0.12em] text-sb-subtle">Illustration</span>
            </div>
          </div>
          <div className="lp-how-steps relative grid gap-5 pl-10">
            <div className="lp-how-progress absolute top-2 bottom-2 left-3 w-px bg-sb-line [&>span]:block [&>span]:h-full [&>span]:w-full [&>span]:origin-top [&>span]:bg-sb-mint" aria-hidden="true"><span /></div>
            {STEPS.map(({ Icon, title, body }, i) => (
              <article key={title} className="lp-step group rounded-2xl border border-sb-line bg-sb-surface/60 p-7 transition-[border-color,background-color,opacity] duration-300 ease-sb-enter lg:min-h-[44vh] lg:opacity-55 lg:data-[active=true]:border-sb-mint/40 lg:data-[active=true]:bg-sb-surface lg:data-[active=true]:opacity-100" data-active={i === step}>
                <span className="font-mono text-xs text-sb-subtle">0{i + 1}</span>
                <span className="mt-5 grid size-11 place-items-center rounded-xl bg-sb-mint/10 text-sb-mint"><Icon size={20} aria-hidden /></span>
                <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-sb-ink">{title}</h3>
                <p className="mt-3 max-w-xl text-[15px] leading-7 text-sb-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="products" className="products-section container-wide"><div className="section-heading"><div><span className="section-index">Our products</span><h2>One purpose.<br />Built for real life.</h2></div><p>One account model, two experiences: for institutions settling across borders, and for people sending money home.</p></div>
        <div className="product-switch" role="group" aria-label="Product preview"><button aria-pressed={rail === "business"} onClick={() => setRail("business")} className={rail === "business" ? "selected" : ""}>Business settlement</button><button aria-pressed={rail === "send"} onClick={() => setRail("send")} className={rail === "send" ? "selected" : ""}>Personal remittance</button></div>
        <div className="product-feature"><div className="feature-text"><div className="feature-icon">{rail === "business" ? <Layers3 size={24} /> : <Globe2 size={24} />}</div><h3>{rail === "business" ? "Confidentiality for business-critical payments." : "A quieter way to send money home."}</h3><p>{rail === "business" ? "A workspace for teams: organization profiles, roles, payment instructions and batch planning validated before anything is signed. Amount-confidential settlement is in development." : "A passkey account you control, payments you approve one by one, and a receipt for each. Local-currency payouts need licensed anchor partners and aren't live yet."}</p><Link href={rail === "business" ? "/business" : "/send"} className="text-link">Discover StealthBridge {rail === "business" ? "Business" : "Send"} <ArrowUpRight size={17} /></Link></div><div className="feature-visual"><span className="diagram-caption">PRODUCT CONCEPT · NOT LIVE PAYMENT DATA</span><div className="demo-path"><div className="path-node"><span>{rail === "business" ? "Institution A" : "Sender"}</span><strong>Origin</strong></div><div className="path-line"><i /><small>Stellar</small></div><div className="path-node shielded"><LockKeyhole /><span>Privacy layer</span></div><div className="path-line"><i /></div><div className="path-node"><span>{rail === "business" ? "Institution B" : "Recipient"}</span><strong>Destination</strong></div></div><div className="diagram-bottom"><span>Visible infrastructure</span><span>Protected information (in development)</span></div></div></div></section>

      <section id="privacy" className="border-y border-sb-line bg-[radial-gradient(80%_60%_at_80%_0%,rgba(140,200,245,.08),transparent_60%),#061b21] py-28 max-md:py-20" aria-labelledby="privacy-title">
        <div className="container-wide">
          <div className="section-heading lp-reveal"><div><span className="section-index lp-reveal-item">Privacy, honestly</span><h2 id="privacy-title" className="lp-reveal-item">What the ledger sees.<br />And what it won&apos;t.</h2></div>
            <p className="lp-reveal-item">Stellar is a public ledger. Here is exactly what a payment reveals today, and what our private payments pool is being built to hide.</p></div>
          <div className="grid grid-cols-2 gap-5 max-lg:grid-cols-1">
            <div className="rounded-3xl border border-sb-amber/25 bg-sb-surface/70 p-7">
              <div className="mb-5 flex items-center gap-2.5 text-sb-ink [&>svg]:text-sb-muted"><Eye size={17} aria-hidden /><strong>A Stellar payment today</strong><span className="ml-auto rounded-full bg-sb-amber/15 px-3 py-1 text-xs font-bold text-sb-amber">Public</span></div>
              <dl className="divide-y divide-sb-line">{LEDGER_FIELDS.map(([k, v]) => <div key={k} className="grid grid-cols-[150px_1fr] gap-4 py-3.5 text-sm max-sm:grid-cols-1 max-sm:gap-1"><dt className="text-sb-subtle">{k}</dt><dd className="font-medium text-sb-amber">{v}</dd></div>)}</dl>
              <p className="mt-5 text-[13px] leading-6 text-sb-subtle">This is how every StealthBridge payment works right now, and each receipt says so.</p>
            </div>
            <div className="lp-ledger-goal rounded-3xl border border-sb-mint/30 bg-[linear-gradient(160deg,rgba(128,246,219,.07),transparent_55%),#092129] p-7">
              <div className="mb-5 flex items-center gap-2.5 text-sb-ink [&>svg]:text-sb-muted"><EyeOff size={17} aria-hidden /><strong>With the private payments pool</strong><span className="ml-auto rounded-full bg-sb-sky/15 px-3 py-1 text-xs font-bold text-sb-sky">In development</span></div>
              <dl className="divide-y divide-sb-line">{LEDGER_FIELDS.map(([k, v, hidden]) => <div key={k} className="lp-field group grid grid-cols-[150px_1fr] gap-4 py-3.5 text-sm max-sm:grid-cols-1 max-sm:gap-1" data-masked="true"><dt className="text-sb-subtle">{k}</dt><dd className="grid font-medium [&>span]:col-start-1 [&>span]:row-start-1 [&>span]:transition-[opacity,filter,transform] [&>span]:duration-500 [&>span]:ease-sb-expo"><span className="text-sb-amber group-data-[masked=true]:-translate-y-1 group-data-[masked=true]:opacity-0 group-data-[masked=true]:blur-[2px]" aria-hidden>{v}</span><span className="inline-flex items-center gap-1.5 text-sb-mint opacity-0 blur-[2px] translate-y-1 group-data-[masked=true]:translate-y-0 group-data-[masked=true]:opacity-100 group-data-[masked=true]:blur-none"><LockKeyhole size={13} aria-hidden /> {hidden}</span></dd></div>)}</dl>
              <p className="mt-5 text-[13px] leading-6 text-sb-subtle">Design goal, not available yet. Built on open-source cryptography that hasn&apos;t been independently audited; it will be labelled &ldquo;Testnet, unaudited&rdquo; until it is.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="principles" className="principles-section !bg-sb-navy !text-sb-ink [&_.section-index]:!text-sb-mint [&_.section-heading>p]:!text-sb-muted [&_article]:!border-sb-line [&_article]:!bg-sb-surface/70 [&_article_svg]:!text-sb-mint [&_article_p]:!text-sb-muted"><div className="container-wide"><div className="section-heading"><div><span className="section-index">Built with restraint</span><h2>Privacy you can reason about.</h2></div><p>Progress without shortcuts. A privacy claim appears here only after the mechanism behind it is implemented and verified.</p></div><div className="principle-grid lp-reveal"><article className="lp-reveal-item"><ShieldCheck /><h3>Evidence, not assertions</h3><p>&ldquo;Completed&rdquo;, &ldquo;verified&rdquo; and &ldquo;private&rdquo; are derived from observed chain evidence, never from a client claim.</p></article><article className="lp-reveal-item"><LockKeyhole /><h3>Protected where it matters</h3><p>Keys stay on your device and drafts are encrypted today; on-chain privacy will come from vetted zero-knowledge systems, not home-made cryptography.</p></article><article className="lp-reveal-item"><Sparkles /><h3>Open by default</h3><p>Contracts, backend, SDK and app are open source, so anyone can check how money and data move.</p></article></div></div></section>

      <section id="stellar" className="container-wide py-28 max-md:py-20" aria-labelledby="stellar-title">
        <div className="section-heading lp-reveal"><div><span className="section-index lp-reveal-item">Built on Stellar</span><h2 id="stellar-title" className="lp-reveal-item">Native to the network.</h2></div>
          <p className="lp-reveal-item">StealthBridge uses Stellar&apos;s own building blocks (Soroban contracts, Stellar Asset Contracts and host cryptography) instead of wrapping a custodial balance.</p></div>
        <div className="lp-reveal grid grid-cols-4 gap-4 max-xl:grid-cols-2 max-sm:grid-cols-1">
          {STELLAR.map(({ Icon, title, body }) => <article key={title} className="lp-reveal-item group rounded-2xl border border-sb-line bg-sb-surface/60 p-6 transition-[border-color,transform] duration-200 ease-sb-enter [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:border-sb-mint/40"><span className="grid size-11 place-items-center rounded-xl bg-sb-sky/10 text-sb-sky transition-colors duration-200 group-hover:bg-sb-mint/10 group-hover:text-sb-mint"><Icon size={20} aria-hidden /></span><h3 className="mt-5 text-lg font-semibold tracking-tight text-sb-ink">{title}</h3><p className="mt-2 text-sm leading-6 text-sb-muted">{body}</p></article>)}
        </div>
      </section>

      <section id="next" className="container-wide py-28 max-md:py-20" aria-labelledby="next-title">
        <div className="section-heading"><div><span className="section-index">What we&apos;re building next</span><h2 id="next-title">More of Stellar.<br />More privacy.</h2></div>
          <p>Each item ships to Testnet first, with tests and on-chain evidence, before anything is described as available.</p></div>
        <div className="lp-road-line relative mb-8 h-px bg-sb-line max-lg:hidden [&>span]:absolute [&>span]:inset-0 [&>span]:origin-left [&>span]:bg-gradient-to-r [&>span]:from-sb-mint [&>span]:to-sb-sky" aria-hidden="true"><span /></div>
        <ol className="lp-road-list grid grid-cols-5 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
          {ROADMAP.map(({ Icon, title, body, state }) => <li key={title} className="flex flex-col gap-3 rounded-2xl border border-sb-line bg-sb-surface/50 p-5"><span className="grid size-10 place-items-center rounded-full border border-sb-mint/30 bg-sb-navy text-sb-mint"><Icon size={18} aria-hidden /></span><span className={"w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold " + (state === "Building" ? "bg-sb-mint/12 text-sb-mint" : "bg-sb-raised text-sb-subtle")}>{state}</span><h3 className="text-base font-semibold text-sb-ink">{title}</h3><p className="text-[13px] leading-6 text-sb-muted">{body}</p></li>)}
        </ol>
      </section>

      <section id="faq" className="container-wide pb-28 max-md:pb-20" aria-labelledby="faq-title">
        <div className="section-heading"><div><span className="section-index">Questions</span><h2 id="faq-title">Straight answers.</h2></div><p>What works, what doesn&apos;t yet, and who controls your money.</p></div>
        <div className="grid gap-3">{FAQ.map(([q, a]) => <details key={q} className="group rounded-2xl border border-sb-line bg-sb-surface/60 open:border-sb-mint/30"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-5 text-[15px] font-semibold text-sb-ink focus-visible:outline-2 focus-visible:outline-sb-mint [&::-webkit-details-marker]:hidden">{q}<ChevronDown size={18} aria-hidden className="shrink-0 text-sb-subtle transition-transform duration-200 ease-sb-enter group-open:rotate-180" /></summary><p className="px-6 pb-6 text-sm leading-7 text-sb-muted">{a}</p></details>)}</div>
      </section>

      <section className="closing-section container-wide"><div className="closing-panel"><div><span className="section-index">THE NEXT CHAPTER OF PAYMENTS</span><h2>The future of payments<br />doesn&apos;t need an audience.</h2></div><div className="flex flex-col items-start gap-4"><Button asChild size="lg"><Link href="/login">Open the app <ArrowUpRight size={17} /></Link></Button><Link className="text-link" href="/send">Discover StealthBridge Send <ArrowRight size={16} /></Link></div></div></section>
    </main>
    <footer className="site-footer container-wide"><Brand /><p>Confidential payments. Without borders.</p><div className="footer-links"><Link href="/business">Business</Link><Link href="/send">Send</Link><Link href="/platform">Privacy & trust</Link><Link href="/login">Sign in</Link></div><span>© {new Date().getFullYear()} StealthBridge · Stellar Testnet</span></footer>
  </div>;
}
