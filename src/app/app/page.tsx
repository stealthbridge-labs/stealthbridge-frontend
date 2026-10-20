import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Building2,Clock3,LockKeyhole,Send,ShieldCheck} from "lucide-react";
import {requireWalletIdentity} from "@/lib/auth-server";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Account overview — StealthBridge"};
export default async function Dashboard(){
 const identity=await requireWalletIdentity();
 return <>
  <div className="account-heading"><span className="section-index">YOUR STEALTHBRIDGE SPACE</span>
   <h1>Welcome to your account.</h1>
   <p>Your payment journey starts here. Find a route, understand your options, and manage your next steps with clarity.</p>
  </div>
  <div className="account-overview-grid">
   <Link href="/app/send" className="account-feature-card"><span className="account-feature-icon"><Send size={26} aria-hidden/></span>
    <span className="account-feature-eyebrow">FOR YOU</span><h2>Send internationally</h2>
    <p>Explore published payment corridors, add a recipient and prepare transfer details when a route is available.</p>
    <span className="account-feature-link">Open transfers <ArrowRight size={17} aria-hidden/></span>
   </Link>
   <Link href="/app/business" className="account-feature-card"><span className="account-feature-icon"><Building2 size={26} aria-hidden/></span>
    <span className="account-feature-eyebrow">FOR ORGANIZATIONS</span><h2>Business payments</h2>
    <p>Explore organizational payment routes, payment references and the controls needed for cross-border settlement.</p>
    <span className="account-feature-link">Open business <ArrowRight size={17} aria-hidden/></span>
   </Link>
  </div>
  <section className="account-status-section" aria-labelledby="account-security-heading">
   <div><span className="section-index">ACCOUNT & SECURITY</span><h2 id="account-security-heading">A clearer picture of your access.</h2></div>
   <div className="account-status-list">
    <div><ShieldCheck size={21} aria-hidden/><div><strong>Wallet identity verified</strong><p>Your sign-in challenge was verified against this Stellar public account.</p><code>{identity.address}</code></div></div>
    <div><LockKeyhole size={21} aria-hidden/><div><strong>Funds stay under your control</strong><p>Signing in is not permission to move funds, create approvals or initiate a private payment.</p></div></div>
    <div><Clock3 size={21} aria-hidden/><div><strong>Payment services</strong><p>Transfer execution, confidential settlement and external payouts remain unavailable while independent verification continues.</p></div></div>
   </div>
  </section>
  <div className="account-footnote">Looking for the bigger picture? <Link href="/platform">Learn about the StealthBridge platform <ArrowUpRight size={14} aria-hidden/></Link></div>
 </>;
}
