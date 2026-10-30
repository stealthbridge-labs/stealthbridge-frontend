import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,EyeOff,Fingerprint,LockKeyhole,ShieldCheck,Wallet2} from "lucide-react";
import {Brand} from "@/components/brand";
export const metadata:Metadata={
 title:"Privacy & trust — StealthBridge",
 description:"See what StealthBridge protects, what remains visible, and how you stay in control of international payment information.",
 alternates:{canonical:"/platform"},
 openGraph:{title:"Your privacy deserves a better payment experience",description:"A plain-language guide to privacy, access and transparency at StealthBridge.",url:"/platform",type:"website"}
};
const principles=[
 {icon:EyeOff,title:"Less unnecessary exposure",body:"Our goal is to reduce avoidable disclosure of payment amounts and relationships. Exact protections depend on independently verified payment methods; they are not live yet."},
 {icon:Wallet2,title:"Your funds stay yours",body:"Connecting a wallet does not give StealthBridge your secret keys. Signing in never authorizes a debit, transfer or approval."},
 {icon:ShieldCheck,title:"Privacy without blind spots",body:"Identity, regulatory requirements and delivery confirmations may still need to be shared with approved payment providers. We will not promise total anonymity."}
];
export default function PrivacyAndTrust(){
 return <div className="trust-page">
  <header className="trust-nav container-wide"><Brand/>
   <nav aria-label="Privacy navigation"><Link href="/send">Personal</Link><Link href="/business">Business</Link><Link href="/routes">Explore routes</Link></nav>
   <Link className="trust-login" href="/login">Your account <ArrowUpRight size={16} aria-hidden/></Link>
  </header>
  <main id="main-content">
   <section className="trust-intro container-wide">
    <div><p className="trust-eyebrow"><LockKeyhole size={17} aria-hidden/> PRIVACY & TRUST</p>
     <h1>Your money is personal.<br/><em>It should feel that way.</em></h1>
     <p className="trust-lead">Not every payment detail needs an audience. StealthBridge is building a calmer way to move money across borders—while being clear about who needs to know what, and why.</p>
     <div className="trust-intro-actions"><Link href="/routes">Explore sending countries <ArrowRight size={17} aria-hidden/></Link><Link href="/send">See how Send works <ArrowUpRight size={17} aria-hidden/></Link></div>
    </div>
    <div className="trust-visual" role="img" aria-label="Privacy illustration showing money held under your control, with permissions chosen intentionally">
     <div className="trust-orbit trust-orbit-one"/><div className="trust-orbit trust-orbit-two"/>
     <span className="trust-orbit-note note-a"><LockKeyhole size={16} aria-hidden/> Private by intention</span>
     <span className="trust-orbit-note note-b"><ShieldCheck size={16} aria-hidden/> Clear permissions</span>
     <div className="trust-core"><Fingerprint size={64} strokeWidth={1.2} aria-hidden/><strong>Stay in control</strong><span>Only you decide when to authorize</span></div>
    </div>
   </section>
   <section className="trust-principles"><div className="container-wide">
    <div className="trust-section-head"><span>WHAT MATTERS</span><h2>A better experience begins with better boundaries.</h2></div>
    <div className="trust-principle-grid">{principles.map(({icon:Icon,title,body},i)=>
     <article key={title}><span className="trust-number">0{i+1}</span><Icon size={29} strokeWidth={1.5} aria-hidden/><h3>{title}</h3><p>{body}</p></article>)}</div>
   </div></section>
   <section className="trust-clarity container-wide"><div><p className="trust-eyebrow">KNOW BEFORE YOU SEND</p><h2>No hidden steps.<br/>No imaginary guarantees.</h2><p>Before a real transfer becomes possible, you should see an actual provider quote, all applicable fees, what the recipient will receive and how delivery is confirmed. StealthBridge does not yet provide live quotes or accept transfers.</p>
   <Link href="/routes">Explore our route information <ArrowRight size={16} aria-hidden/></Link></div>
   <div className="trust-clarity-panel"><h3>What StealthBridge will never imply</h3><dl>
    <div><dt>Account access</dt><dd>Not permission to move money</dd></div>
    <div><dt>A visible route</dt><dd>Not a confirmed payout or exchange quote</dd></div>
    <div><dt>Blockchain inclusion</dt><dd>Not proof the recipient was paid</dd></div>
    <div><dt>Privacy research</dt><dd>Not an active confidentiality guarantee</dd></div>
   </dl></div></section>
  </main>
  <footer className="trust-footer container-wide"><Brand/><p>Clarity is part of privacy. Payment services are in development.</p><Link href="/business">For businesses <ArrowUpRight size={15} aria-hidden/></Link></footer>
 </div>;
}
