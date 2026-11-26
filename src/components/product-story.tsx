"use client";

import {useEffect,useState} from "react";
import Image from "next/image";
import Link from "next/link";
import {ArrowRight,ArrowUpRight,Check,ChevronDown,Globe2,Layers3,LockKeyhole,Menu,X} from "lucide-react";
import {ProductNavigation,EditorialSectionHeading,StoryActionGroup,NarrativeFeatureBlock} from "@/components/marketing/primitives";
import {SiteFooter,useReveal} from "@/components/marketing/site-chrome";

type Product = "business" | "send" | "platform";
type Story = {
 eyebrow:string; word:string; emph:string; description:string;
 icon:"business"|"send"|"platform"; label:string;
 visualTitle:string; visualSub:string; legs:[string,string,string];
 sections:{eyebrow:string;title:string;description:string;number:string}[];
 features:{index:string;title:string;body:string}[];
 faqs:{question:string;answer:string}[];
 closing:string; closingSub:string;nextHref:string;nextLabel:string;
};
const stories:Record<Product,Story>={
 business:{
  eyebrow:"INTRODUCING STEALTHBRIDGE BUSINESS",word:"Confidentiality",emph:"means business.",
  description:"For businesses moving value across borders, privacy and accountability should belong in the same conversation. StealthBridge Business is our vision for more intentional global settlement.",
  icon:"business",label:"Institutional settlements",
  visualTitle:"A settlement with context",visualSub:"Concept illustration · No transaction has been initiated",
  legs:["Initiate","Protect","Reconcile"],
  sections:[
   {eyebrow:"01 / AN INSTITUTIONAL PERSPECTIVE",title:"Built around the way businesses move.",description:"Cross-border settlement involves more than a transaction. Counterparties, permissions, currency movement, policy checks and reconciliation all matter. We're creating a workspace designed to bring that journey into focus.",number:"01"},
   {eyebrow:"02 / RIGHT-SIZED DISCLOSURE",title:"Privacy without losing oversight.",description:"Amount-confidential payment mechanisms can help protect sensitive financial information. Known business counterparties still need appropriate visibility, authorization and auditability. Both requirements inform the product design.",number:"02"},
   {eyebrow:"03 / REAL-WORLD OPERATIONS",title:"Settlement doesn't end on-chain.",description:"A confirmed blockchain transaction is not proof that a bank or payout provider completed its obligation. Our architecture separates settlement events, partner confirmations and eventual reconciliation.",number:"03"}
  ],
  features:[
   {index:"A",title:"Role-aware workflows",body:"Designing for organizations, finance teams and approval responsibilities—not just individual wallets."},
   {index:"B",title:"Confidential value",body:"Exploring confidential assets with visible institutional control and carefully scoped disclosure."},
   {index:"C",title:"Clear settlement states",body:"A payment lifecycle where confirmations and external payouts are understood as separate events."}
  ],
  faqs:[
    {question:"Does confidential settlement mean our counterparties are anonymous?",answer:"No. Institutional confidentiality focuses on protecting sensitive values while maintaining responsible counterparty identification, required disclosure and audit controls. Exact privacy guarantees depend on the verified asset and protocol."},
    {question:"Can we initiate business settlements today?",answer:"Not yet. StealthBridge Business is being developed and tested; the product does not currently offer live fund movement, payout providers or institution onboarding."},
    {question:"Does an on-chain confirmation complete an international payout?",answer:"No. Stellar transaction inclusion and an external bank or payout-provider confirmation are separate events. The architecture is designed to distinguish them, and reconciliation requires independent evidence."}
   ],
  closing:"Business moves forward when trust goes both ways.",
  closingSub:"StealthBridge Business is in active development. The settlement experience is not currently available for financial transactions.",
  nextHref:"/platform",nextLabel:"Explore our approach"
 },
 send:{
  eyebrow:"INTRODUCING STEALTHBRIDGE SEND",word:"Close to home.",emph:"Across borders.",
  description:"Sending money across the world is personal. We're imagining a remittance experience that feels simpler, clearer and more respectful of the information people share.",
  icon:"send",label:"Personal remittances",
  visualTitle:"A more human payment journey",visualSub:"Concept illustration · Not an active payout service",
  legs:["Send","Shield","Receive"],
  sections:[
   {eyebrow:"01 / ABOUT PEOPLE",title:"A journey that feels like yours.",description:"A transfer should be easy to understand before you approve it. Our consumer experience is being designed around clear steps, transparent eligibility and meaningful status updates.",number:"01"},
   {eyebrow:"02 / PERSONAL PRIVACY",title:"Your payments are personal.",description:"We're investigating privacy mechanisms that protect amounts and relationships where supported. Public funding and withdrawal steps, and information held by regulated providers, can still expose details.",number:"02"},
   {eyebrow:"03 / DELIVERY WITH CLARITY",title:"Know what happens next.",description:"From wallet authorization to on-chain confirmation and eventual local delivery, every part of the journey deserves its own honest status. No imaginary completion screens.",number:"03"}
  ],
  features:[
   {index:"A",title:"Straightforward by design",body:"Careful language, accessible forms, and a journey people can understand before moving money."},
   {index:"B",title:"Privacy with boundaries",body:"Making meaningful privacy choices clear without suggesting that every stage of a payment is anonymous."},
   {index:"C",title:"Support for real life",body:"Designing for interruptions, delays, declined transfers and safe recipient recovery."}
  ],
  faqs:[
    {question:"Is StealthBridge Send available for live remittances?",answer:"Not yet. You can create a passkey smart account and send test payments on Stellar Testnet today. We do not collect deposits, issue FX quotes or carry out real-world payouts."},
    {question:"Does a private payment hide every part of the journey?",answer:"No. Different privacy technologies conceal different information. Public deposits and withdrawals, timing patterns, and details disclosed to regulated service providers may still be observable."},
    {question:"How will I know when a recipient has received their money?",answer:"The intended experience separates on-chain progress from external delivery confirmation. We won't show a completed payout without evidence from the actual provider."}
   ],
  closing:"Distance should feel smaller.",
  closingSub:"Passkey payments between Stellar addresses work today on Testnet. Real-money transfers and local-currency payouts are not yet available.",
  nextHref:"/business",nextLabel:"Discover StealthBridge Business"
 },
 platform:{
  eyebrow:"THE THINKING BEHIND STEALTHBRIDGE",word:"More than",emph:"a payment rail.",
  description:"A connected foundation for confidentiality, responsible payment operations and better cross-border experiences. We are building separate products on a shared set of carefully defined principles.",
  icon:"platform",label:"The StealthBridge platform",
  visualTitle:"One foundation. Different needs.",visualSub:"Architecture concept · Capabilities under development",
  legs:["Experience","Orchestrate","Settle"],
  sections:[
   {eyebrow:"01 / MODULAR FOUNDATIONS",title:"Built to connect—not constrain.",description:"StealthBridge brings together distinct user experiences, orchestration services, Stellar smart contracts and developer interfaces. Modular boundaries make it possible to improve each part without pretending that one protocol serves every use case.",number:"01"},
   {eyebrow:"02 / PRIVACY BY INTENT",title:"The right privacy for each payment.",description:"Confidential amounts between known institutions and shielded consumer relationships are different problems. We evaluate the underlying cryptographic approaches separately and verify actual support before enabling them.",number:"02"},
   {eyebrow:"03 / BEYOND THE LEDGER",title:"Built with the wider journey in mind.",description:"Real-world payments involve asset issuers, eligibility, compliance, exchange rates, liquidity, external partners and reconciliation. Our design keeps these requirements visible while working toward more private execution.",number:"03"}
  ],
  features:[
   {index:"A",title:"Stellar foundation",body:"Building on Stellar and Soroban with Testnet-first verification and explicit protocol compatibility."},
   {index:"B",title:"Distinct privacy rails",body:"Researching confidential assets and shielded payments without conflating their guarantees."},
   {index:"C",title:"Designed to scale",body:"Shared standards and modular interfaces, with honest separation of blockchain and off-chain obligations."}
  ],
  faqs:[
    {question:"Why use more than one privacy mechanism?",answer:"Businesses may need concealed transaction values between known parties; consumers may seek more private payment relationships. These are distinct properties with distinct cryptographic and operational requirements."},
    {question:"Why is Stellar part of the design?",answer:"StealthBridge is developing on Stellar and Soroban because their transaction and contract infrastructure can support carefully verified financial workflows. No choice of ledger alone guarantees privacy or payouts."},
    {question:"Is StealthBridge a bank or a live payment network?",answer:"No. The platform is still under development. Live regulated settlement would require verified assets, compliance controls, financial partners and security reviews that aren't currently complete."}
   ],
  closing:"A different way forward starts with better foundations.",
  closingSub:"The StealthBridge platform is being developed and validated. Product payment services are not yet available.",
  nextHref:"/business",nextLabel:"Explore StealthBridge Business"
 }
};

export function ProductStory({product}:{product:Product}){
 const page=useReveal();
 const [menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{
  if(!menuOpen)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenuOpen(false);};
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 },[menuOpen]);
 const data=stories[product];
 const Icon=product==="business"?Layers3:product==="send"?Globe2:LockKeyhole;
 return <div className={"mk story-page story-"+product} ref={page}>
 <header className="mk-header story-nav">
  <div className="mk-wrap"><div className="mk-header-inner">
   <Link href="/" className="mk-logo" aria-label="StealthBridge home">
    <Image src="/brand/stealthbridge-symbol.svg" alt="" width={30} height={30} priority/><span aria-hidden>StealthBridge</span>
   </Link>
   <ProductNavigation current={product} menuOpen={menuOpen} onNavigate={()=>setMenuOpen(false)}/>
   <div className="mk-header-cta"><Link href="/" className="sb-btn sb-btn-ghost sb-btn-sm story-back">Back to home <ArrowUpRight size={15} aria-hidden/></Link></div>
   <button type="button" className="sb-icon-btn mk-menu-btn" aria-label={menuOpen?"Close menu":"Open menu"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X size={18} aria-hidden/>:<Menu size={18} aria-hidden/>}</button>
  </div></div>
 </header>
 <main id="main-content">
  <div className="mk-wrap">
   <section className="mk-hero story-hero">
    <div className="story-content">
     <span className="mk-kicker story-enter mk-hero-anim"><b>{product==="send"?"Personal":product==="business"?"Business":"Platform"}</b> {data.label}</span>
     <h1 className="mk-h1 story-enter mk-hero-anim">{data.word}<br/><em>{data.emph}</em></h1>
     <p className="mk-lead story-enter mk-hero-anim">{data.description}</p>
     <div className="mk-hero-ctas mk-hero-anim">
      {product!=="platform"?<Link className="sb-btn sb-btn-primary sb-btn-lg story-wallet-entry" href={"/login?next=/app/"+product}>Sign in to StealthBridge <ArrowUpRight size={16} aria-hidden/></Link>:null}
      <StoryActionGroup/>
     </div>
     {product!=="platform"?<p className="mk-hero-note"><Link className="sb-link" href="/routes">Explore configured corridors <ArrowRight size={14} aria-hidden/></Link></p>:null}
    </div>
    <div className="mk-stage story-art" role="img" aria-label={"Conceptual illustration for "+data.label+", not a live transaction"}>
     <div className="story-diagram" aria-hidden>
      {data.legs.map((name,index)=><div className="story-diagram-node" key={name} data-core={index===1}>
       <span>{index===1?<Icon size={26} strokeWidth={1.5}/>:index===0?<Layers3 size={22} strokeWidth={1.5}/>:<Check size={22} strokeWidth={1.8}/>}</span>
       <strong>{name}</strong>
      </div>)}
     </div>
     <span className="mk-stage-caption">{data.label} · product concept</span>
    </div>
   </section>
  </div>
  <section id="story-perspective" className="mk-section story-overview" style={{paddingTop:48}}>
   <div className="mk-wrap">
    <EditorialSectionHeading eyebrow="What we're building" title={data.visualTitle} description={data.visualSub}/>
    <div className="story-flow story-reveal" aria-label="Illustrative product journey">
     {data.legs.map((name,index)=><div className="story-flow-item" key={name}>
       <span className="flow-index">0{index+1}</span>
       <strong>{name}</strong>
       {index!==2&&<span className="flow-connector" aria-hidden="true"><ArrowRight size={18}/></span>}
     </div>)}
    </div>
   </div>
  </section>
  <section className="mk-wrap story-chapters">
   {data.sections.map((section)=><article className="story-chapter story-reveal" key={section.number}>
    <span className="story-chapter-number">{section.number}</span>
    <div><span className="mk-label">{section.eyebrow.replace(/^\d+ \/ /,"").toLowerCase().replace(/^./,c=>c.toUpperCase())}</span><h2>{section.title}</h2></div>
    <p className="mk-body">{section.description}</p>
   </article>)}
  </section>
  <section className="mk-section story-values">
   <div className="mk-wrap"><EditorialSectionHeading eyebrow="Product principles" title="Considered at every layer." description="Designed around the real responsibilities of moving value."/>
    <div className="story-value-grid">{data.features.map(x=><NarrativeFeatureBlock key={x.index} index={x.index} title={x.title} body={x.body}/>)}</div>
   </div>
  </section>
  <section className="mk-section mk-wrap story-faq" style={{paddingTop:0}} aria-labelledby="product-questions">
   <EditorialSectionHeading eyebrow="Questions worth asking" title="Clarity at every step." id="product-questions" description="What StealthBridge is building, what privacy can and cannot mean, and what is not yet available."/>
   <div className="story-faq-list">
    {data.faqs.map((item,index)=><details className="story-faq-item story-reveal" key={item.question}>
      <summary><span className="story-faq-index">0{index+1}</span><span>{item.question}</span><ChevronDown size={20} aria-hidden="true"/></summary>
      <p>{item.answer}</p>
    </details>)}
   </div>
  </section>
  <div className="mk-wrap">
   <section className="mk-band story-ending story-reveal">
    <div><span className="mk-label" style={{color:"var(--sb-mint)"}}>Looking ahead</span><h2 className="mk-h2" style={{color:"#fff"}}>{data.closing}</h2><p className="mk-body">{data.closingSub}</p></div>
    <Link className="sb-btn sb-btn-mint sb-btn-lg" href={data.nextHref}>{data.nextLabel} <ArrowUpRight size={17} aria-hidden/></Link>
   </section>
  </div>
 </main>
 <SiteFooter/>
 </div>;
}
