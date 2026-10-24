import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight} from "lucide-react";
import {Brand} from "@/components/brand";
import {CustomerRouteExplorer} from "@/components/customer-route-explorer";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Explore payment corridors — StealthBridge",
 description:"Explore current operator-configured Stellar Testnet corridors without a wallet. Honest availability, no fabricated exchange rates, fees or delivery promises.",
 alternates:{canonical:"/routes"},
 robots:{index:true,follow:true},
 openGraph:{title:"Explore payment corridors — StealthBridge",description:"Verified corridor metadata. No payment quotes or transfers yet.",url:"/routes",type:"website"}
};
export default function RoutesPage(){
 return <div className="routes-page">
  <header className="routes-nav">
   <Brand/>
   <nav aria-label="Routes navigation">
    <Link href="/send">Personal</Link>
    <Link href="/business">Business</Link>
    <Link className="route-signin-link" href="/login">Sign in <ArrowUpRight size={15} aria-hidden/></Link>
   </nav>
  </header>
  <main id="main-content">
   <section className="routes-hero">
    <div className="route-hero-top"><Link href="/" className="route-back"><ArrowLeft size={16} aria-hidden/> Back to StealthBridge</Link><span className="route-hero-state"><span/> PUBLIC TESTNET CATALOG</span></div>
    <span className="route-kicker">A CLEARER VIEW OF GLOBAL MOVEMENT</span>
    <h1>Explore corridors.<br/><em>Know what's real.</em></h1>
    <p>Check the payment routes StealthBridge has actually configured. Discover the geography and technology being explored—with no wallet connection, imaginary exchange rates or promises that money can move today.</p>
   </section>
   <CustomerRouteExplorer/>
  </main>
  <footer className="routes-footer"><span>StealthBridge · Information, not a payment offer</span>
   <Link href="/platform">How our platform works <ArrowUpRight size={15} aria-hidden/></Link>
  </footer>
 </div>;
}
