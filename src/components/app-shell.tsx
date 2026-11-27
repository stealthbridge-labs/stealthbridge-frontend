"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Building2, EyeOff, FileLock2, Fingerprint, Globe2, House, LayoutGrid, Receipt, Send, Settings2, X } from "lucide-react";
import { AccountLogout } from "@/components/account-logout";

type Item = { href: string; label: string; Icon: typeof House };

/** The four things a customer does every day. */
const PRIMARY: Item[] = [
  { href: "/app", label: "Home", Icon: House },
  { href: "/app/send", label: "Send", Icon: Send },
  { href: "/app/activity", label: "Activity", Icon: Receipt },
  { href: "/app/accounts", label: "Accounts", Icon: Fingerprint },
];
const BUSINESS: Item = { href: "/app/business", label: "Business", Icon: Building2 };

function secondary(profilesEnabled: boolean): Item[] {
  return [
    { href: "/app/routes", label: "Cross-border routes", Icon: Globe2 },
    { href: "/app/instructions", label: "Saved drafts", Icon: FileLock2 },
    { href: "/app/privacy", label: "Privacy", Icon: EyeOff },
    ...(profilesEnabled ? [{ href: "/app/settings", label: "Settings", Icon: Settings2 }] : []),
  ];
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

const TITLES: [RegExp, string][] = [
  [/^\/app$/, "Home"],
  [/^\/app\/send/, "Send"],
  [/^\/app\/activity/, "Activity"],
  [/^\/app\/accounts/, "Accounts"],
  [/^\/app\/routes/, "Cross-border routes"],
  [/^\/app\/instructions/, "Saved drafts"],
  [/^\/app\/business/, "Business"],
  [/^\/app\/settings/, "Settings"],
  [/^\/app\/privacy/, "Privacy"],
];

function short(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function NavLink({ item, pathname, onClick }: { item: Item; pathname: string; onClick?: () => void }) {
  const { href, label, Icon } = item;
  return (
    <Link href={href} className="sb-nav-item" onClick={onClick} aria-current={isActive(pathname, href) ? "page" : undefined}>
      <Icon size={17} aria-hidden /> {label}
    </Link>
  );
}

export function AppShell({ address, profilesEnabled, children }: { address: string; profilesEnabled: boolean; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const [more, setMore] = useState(false);
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "StealthBridge";
  const extra = secondary(profilesEnabled);

  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  return (
    <div className="sb-app">
      <aside className="sb-sidebar" aria-label="Sidebar">
        <Link href="/app" className="sb-sidebar-brand" aria-label="StealthBridge home">
          <Image src="/brand/stealthbridge-symbol.svg" alt="" width={28} height={28} priority />
          StealthBridge
        </Link>
        <nav className="sb-nav" aria-label="Product areas">
          {PRIMARY.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
          <span className="sb-nav-divider" aria-hidden />
          <NavLink item={BUSINESS} pathname={pathname} />
        </nav>
        <nav className="sb-nav sb-nav-secondary" aria-label="More">
          {extra.map((item) => <NavLink key={item.href} item={item} pathname={pathname} />)}
        </nav>
        <p className="sb-sidebar-foot">Stellar Testnet · test assets only</p>
      </aside>

      <div className="sb-main-col">
        <header className="sb-topbar">
          <Link href="/app" className="sb-mobile-bar" aria-label="StealthBridge home">
            <Image src="/brand/stealthbridge-symbol.svg" alt="" width={24} height={24} />
            StealthBridge
          </Link>
          <span className="sb-topbar-title">{title}</span>
          <span className="sb-topbar-spacer" />
          <span className="sb-network" title="All payments run on Stellar Testnet">
            <span className="sb-network-text">Testnet</span>
          </span>
          <span className="sb-account-chip" aria-label="Signed-in customer account">
            <span className="sb-avatar" aria-hidden>{address.slice(1, 3)}</span>
            <span className="sb-account-text">{short(address)}</span>
          </span>
          <div className="sb-topbar-signout"><AccountLogout /></div>
        </header>
        <main id="main-content" tabIndex={-1} className="sb-content">
          {children}
        </main>
      </div>

      <nav className="sb-tabbar" aria-label="Quick navigation">
        {PRIMARY.map(({ href, label, Icon }) => (
          <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
            <Icon size={20} aria-hidden />
            {label}
          </Link>
        ))}
        <button type="button" onClick={() => setMore(true)} aria-haspopup="dialog" aria-expanded={more}>
          <LayoutGrid size={20} aria-hidden />
          More
        </button>
      </nav>

      {more ? (
        <>
          <div className="sb-drawer-backdrop" onClick={() => setMore(false)} aria-hidden />
          <div className="sb-drawer" role="dialog" aria-modal="true" aria-label="More">
            <div className="sb-drawer-handle" />
            <div className="sb-card-row" style={{ alignItems: "center", marginBottom: 6 }}>
              <strong style={{ fontSize: 16 }}>More</strong>
              <button type="button" className="sb-icon-btn" onClick={() => setMore(false)} aria-label="Close menu" autoFocus>
                <X size={18} aria-hidden />
              </button>
            </div>
            <nav className="sb-nav sb-nav-sheet" aria-label="More destinations">
              {[BUSINESS, ...extra].map((item) => <NavLink key={item.href} item={item} pathname={pathname} onClick={() => setMore(false)} />)}
            </nav>
            <div style={{ marginTop: 16 }}><AccountLogout /></div>
          </div>
        </>
      ) : null}
    </div>
  );
}
