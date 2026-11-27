import { BusinessNav } from "@/components/business/business-nav";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BusinessNav />
      {children}
    </>
  );
}
