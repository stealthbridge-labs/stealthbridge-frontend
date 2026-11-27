"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Building2,
  FileLock2,
  FileSpreadsheet,
  Fingerprint,
  Globe2,
  House,
  LayoutGrid,
  Receipt,
  Send,
  ShieldCheck,
  EyeOff,
  X,
} from "lucide-react";
import { AccountLogout } from "@/components/account-logout";

type Item = { href: string; label: string; Icon: typeof House };
type Group = { name: string; items: Item[] };

const businessDetail = /^\/app\/business\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;

function groups(profilesEnabled: boolean): Group[] {
  return [
    {
      name: "Money",
      items: [
        { href: "/app", label: "Home", Icon: House },
        { href: "/app/send", label: "Send", Icon: Send },
        { href: "/app/activity", label: "Activity", Icon: Receipt },
        { href: "/app/accounts", label: "Smart accounts", Icon: Fingerprint },
      ],
    },
    {
      name: "Planning",
      items: [
        { href: "/app/routes", label: "Cross-border routes", Icon: Globe2 },
        { href: "/app/instructions", label: "Saved instructions", Icon: FileLock2 },
      ],
    },
    {
      name: "Business",
      items: [
        { href: "/app/business", label: "Workspace", Icon: Building2 },
        { href: "/app/business/payments", label: "Single payment", Icon: ArrowLeftRight },
        { href: "/app/business/batch", label: "Batch planner", Icon: FileSpreadsheet },
      ],
    },
    {
      name: "Account",
      items: [
        ...(profilesEnabled ? [{ href: "/app/settings", label: "Security & settings", Icon: ShieldCheck }] : []),
        { href: "/app/privacy", label: "Privacy centre", Icon: EyeOff },
      ],
    },
  ].filter((g) => g.items.length > 0);
}

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  if (href === "/app/business") return pathname === "/app/business" || businessDetail.test(pathname);
  return pathname === href || pathname.startsWith(href + "/");
}

const TITLES: [RegExp, string][] = [
  [/^\/app$/, "Home"],
  [/^\/app\/send/, "Send money"],
  [/^\/app\/activity/, "Activity"],
  [/^\/app\/accounts/, "Smart accounts"],
  [/^\/app\/routes/, "Cross-border routes"],
  [/^\/app\/instructions/, "Saved instructions"],
  [/^\/app\/business\/payments/, "Business payments"],
  [/^\/app\/business\/batch/, "Batch planner"],
  [/^\/app\/business/, "Business"],
  [/^\/app\/settings/, "Security & settings"],
  [/^\/app\/privacy/, "Privacy centre"],
];

function short(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function AppShell({ address, profilesEnabled, children }: { address: string; profilesEnabled: boolean; children: React.ReactNode }) {
  const pathname = usePathname() ?? "/app";
  const [more, setMore] = useState(false);
  const nav = groups(profilesEnabled);
  const title = TITLES.find(([re]) => re.test(pathname))?.[1] ?? "StealthBridge";

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => {
    if (!more) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMore(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [more]);

  const tabs: Item[] = [
    { href: "/app", label: "Home", Icon: House },
    { href: "/app/send", label: "Send", Icon: Send },
    { href: "/app/activity", label: "Activity", Icon: Receipt },
    { href: "/app/accounts", label: "Accounts", Icon: Fingerprint },
  ];

  return (
    <div className="sb-app">
      <aside className="sb-sidebar" aria-label="Sidebar">
        <Link href="/app" className="sb-sidebar-brand" aria-label="StealthBridge home">
          <Image src="/brand/stealthbridge-symbol.svg" alt="" width={30} height={30} priority />
          StealthBridge
        </Link>
        <nav className="sb-nav" aria-label="Product areas">
          {nav.map((g) => (
            <div key={g.name} className="sb-nav">
              <span className="sb-nav-label">{g.name}</span>
              {g.items.map(({ href, label, Icon }) => (
                <Link key={href} href={href} className="sb-nav-item" aria-current={isActive(pathname, href) ? "page" : undefined}>
                  <Icon size={17} aria-hidden /> {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-sidebar-foot">
          <strong>Stellar Testnet</strong>
          Payments use test assets only. No real money moves.
        </div>
      </aside>

      <div className="sb-main-col">
        <header className="sb-topbar">
          <Link href="/app" className="sb-mobile-bar" aria-label="StealthBridge home">
            <Image src="/brand/stealthbridge-symbol.svg" alt="" width={26} height={26} />
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
        {tabs.map(({ href, label, Icon }) => (
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
            <div className="sb-card-row" style={{ alignItems: "center", marginBottom: 8 }}>
              <strong style={{ fontSize: 16 }}>More</strong>
              <button type="button" className="sb-icon-btn" onClick={() => setMore(false)} aria-label="Close menu" autoFocus>
                <X size={18} aria-hidden />
              </button>
            </div>
            <nav className="sb-nav" aria-label="More destinations">
              {nav.map((g) => (
                <div key={g.name} className="sb-nav">
                  <span className="sb-nav-label">{g.name}</span>
                  {g.items.map(({ href, label, Icon }) => (
                    <Link key={href} href={href} className="sb-nav-item" onClick={() => setMore(false)} aria-current={isActive(pathname, href) ? "page" : undefined}>
                      <Icon size={17} aria-hidden /> {label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
            <div style={{ marginTop: 16 }}><AccountLogout /></div>
          </div>
        </>
      ) : null}
    </div>
  );
}
