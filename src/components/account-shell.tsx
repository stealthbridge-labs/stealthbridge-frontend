import { AppShell } from "@/components/app-shell";

/** Authenticated application frame: sidebar + top bar on desktop, tab bar + drawer on mobile. */
export function AccountShell({ address, children }: { address: string; children: React.ReactNode }) {
  return (
    <AppShell address={address} profilesEnabled={process.env.STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED === "true"}>
      {children}
    </AppShell>
  );
}
