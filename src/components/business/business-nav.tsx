"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/app/business", label: "Overview" },
  { href: "/app/business/payments", label: "Payments" },
  { href: "/app/business/batch", label: "Batch" },
];

/** Business tools live inside the business context, not in the customer sidebar. */
export function BusinessNav() {
  const pathname = usePathname() ?? "/app/business";
  const current = (href: string) =>
    href === "/app/business"
      ? pathname === href || /^\/app\/business\/[0-9a-f-]{36}$/.test(pathname)
      : pathname.startsWith(href);
  return (
    <nav className="sb-tabs" aria-label="Business sections">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} aria-current={current(t.href) ? "page" : undefined}>{t.label}</Link>
      ))}
    </nav>
  );
}
