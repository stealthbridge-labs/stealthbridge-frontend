import type {Metadata} from "next";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight} from "lucide-react";
import {Brand} from "@/components/brand";
import {CustomerRouteExplorer} from "@/components/customer-route-explorer";
export const dynamic="force-dynamic";
export const metadata:Metadata={
 title:"Send money internationally — StealthBridge",
 description:"Choose where to send money, see verified route information and understand what is not yet available.",
 alternates:{canonical:"/routes"},
 robots:{index:true,follow:true},
 openGraph:{title:"Send money internationally — StealthBridge",description:"Verified corridor metadata. No payment quotes or transfers yet.",url:"/routes",type:"website"}
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
    <div className="route-hero-top"><Link href="/" className="route-back"><ArrowLeft size={16} aria-hidden/> Back to StealthBridge</Link><span className="route-hero-state"><span/> ROUTE EXPLORER</span></div>
    <span className="route-kicker">GOOD PAYMENTS BEGIN WITH CLARITY</span>
    <h1>Where should your<br/><em>money go next?</em></h1>
    <p>Find your sending and receiving countries. We'll only show routes we can verify. No sign-in required and no promises of delivery before the service is ready.</p>
   </section>
   <CustomerRouteExplorer/>
  </main>
  <footer className="routes-footer"><span>StealthBridge · Information, not a payment offer</span>
   <Link href="/platform">How we protect your information <ArrowUpRight size={15} aria-hidden/></Link>
  </footer>
 </div>;
}
