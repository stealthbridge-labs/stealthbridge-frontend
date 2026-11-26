"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

function links(onHome: boolean) {
  return [
    { href: "/platform", label: "Privacy & trust" },
    { href: "/send", label: "For people" },
    { href: "/business", label: "For business" },
    { href: onHome ? "#principles" : "/#principles", label: "Our approach" },
  ];
}

/** Public site header. One navigation landmark: inline on desktop, a disclosure on phones. */
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  return (
    <header className="mk-header" data-scrolled={scrolled}>
      <div className="mk-wrap">
        <div className="mk-header-inner">
          <Link href="/" className="mk-logo" aria-label="StealthBridge home">
            <Image src="/brand/stealthbridge-symbol.svg" alt="" width={30} height={30} priority />
            <span aria-hidden>StealthBridge</span>
          </Link>
          <nav id="stealthbridge-site-navigation" className="mk-nav" data-open={open} aria-label="Main navigation">
            {links(pathname === "/").map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} aria-current={pathname === l.href ? "page" : undefined}>{l.label}</Link>
            ))}
            <Link className="mk-nav-cta sb-btn sb-btn-primary" href="/login" onClick={() => setOpen(false)}>Open the app</Link>
          </nav>
          <div className="mk-header-cta">
            <Link className="sb-btn sb-btn-ghost sb-btn-sm" href="/login">Sign in</Link>
            <Link className="sb-btn sb-btn-primary sb-btn-sm" href="/login" >Open the app</Link>
          </div>
          <button type="button" className="sb-icon-btn mk-menu-btn" aria-controls="stealthbridge-site-navigation" aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"} onClick={() => setOpen(!open)}>
            {open ? <X size={18} aria-hidden /> : <Menu size={18} aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap">
        <div className="mk-footer-grid">
          <div>
            <Link href="/" className="mk-logo" aria-label="StealthBridge home">
              <Image src="/brand/stealthbridge-symbol.svg" alt="" width={28} height={28} />
              StealthBridge
            </Link>
            <p className="sb-muted" style={{ marginTop: 14, maxWidth: 300 }}>Open-source confidential payment infrastructure for people and businesses, built on Stellar.</p>
          </div>
          <div><h4>Product</h4><ul><li><Link href="/send">Personal</Link></li><li><Link href="/business">Business</Link></li><li><Link href="/routes">Payment routes</Link></li></ul></div>
          <div><h4>Trust</h4><ul><li><Link href="/platform">Privacy & security</Link></li><li><Link href="/platform#status">What&apos;s live today</Link></li></ul></div>
          <div><h4>Account</h4><ul><li><Link href="/login">Sign in</Link></li><li><Link href="/login">Open the app</Link></li></ul></div>
        </div>
        <div className="mk-footer-bottom">
          <span>© {new Date().getFullYear()} StealthBridge. Open source under the MIT license.</span>
          <span>Running on Stellar Testnet. No real money moves.</span>
        </div>
      </div>
    </footer>
  );
}

/**
 * Scroll reveals for public pages. Disabled under reduced motion (content is
 * fully visible). Publishes the live ScrollTrigger count for leak tests.
 */
export function useReveal() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let revert = () => {};
    let cancelled = false;
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        gsap.from(".mk-hero-anim", { opacity: 0, y: 18, duration: 0.8, ease: "power3.out", stagger: 0.08 });
        // Only below-the-fold elements animate, and only when they scroll into view;
        // content is never hidden before its trigger is live.
        gsap.utils.toArray<HTMLElement>(".mk-reveal, .story-reveal").forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight) return;
          ScrollTrigger.create({
            trigger: el, start: "top 92%", once: true,
            onEnter: () => gsap.fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }),
          });
        });
      }, root);
      document.documentElement.dataset.stealthbridgeGsapTriggers = String(ScrollTrigger.getAll().length);
      revert = () => {
        ctx.revert();
        document.documentElement.dataset.stealthbridgeGsapTriggers = String(ScrollTrigger.getAll().length);
      };
    });
    return () => { cancelled = true; revert(); };
  }, []);
  return root;
}
