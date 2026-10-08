"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import gsap from "gsap";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {ArrowRight,ArrowUpRight,Check,ChevronDown,EyeOff,Globe2,Layers3,LockKeyhole,Menu,ShieldCheck,X} from "lucide-react";
import {Brand} from "@/components/brand";

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
    {question:"Is StealthBridge Send available for live remittances?",answer:"No. It is an in-development product experience. We do not currently collect deposits, issue FX quotes or carry out real-world payouts."},
    {question:"Does a private payment hide every part of the journey?",answer:"No. Different privacy technologies conceal different information. Public deposits and withdrawals, timing patterns, and details disclosed to regulated service providers may still be observable."},
    {question:"How will I know when a recipient has received their money?",answer:"The intended experience separates on-chain progress from external delivery confirmation. We won't show a completed payout without evidence from the actual provider."}
   ],
  closing:"Distance should feel smaller.",
  closingSub:"StealthBridge Send is under active development. Real transfers and fiat payouts are not yet available.",
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
 const page=useRef<HTMLDivElement>(null);
 const [menuOpen,setMenuOpen]=useState(false);
 useEffect(()=>{
  if(!menuOpen)return;
  const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setMenuOpen(false);};
  window.addEventListener("keydown",onKey);
  return ()=>window.removeEventListener("keydown",onKey);
 },[menuOpen]);
 const data=stories[product];
 useEffect(()=>{
  if(!page.current||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  gsap.registerPlugin(ScrollTrigger);
  const ctx=gsap.context(()=>{
   gsap.timeline({defaults:{ease:"power3.out"}})
    .fromTo(".story-nav",{opacity:0,y:-18},{opacity:1,y:0,duration:.7})
    .fromTo(".story-enter",{opacity:0,y:55,filter:"blur(9px)"},{opacity:1,y:0,filter:"blur(0px)",duration:1,stagger:.12},-.3)
    .fromTo(".story-art",{opacity:0,scale:.88,y:28},{opacity:1,scale:1,y:0,duration:1.2},-.7);
   gsap.to(".story-halo",{scale:1.18,opacity:.65,duration:4,repeat:-1,yoyo:true,ease:"sine.inOut"});
   gsap.to(".story-core",{rotation:360,duration:45,repeat:-1,ease:"none",transformOrigin:"50% 50%"});
   gsap.to(".story-float",{y:-13,duration:4.2,repeat:-1,yoyo:true,ease:"sine.inOut"});
   gsap.utils.toArray<HTMLElement>(".story-reveal").forEach(item=>{
    gsap.fromTo(item,{opacity:0,y:48},{opacity:1,y:0,duration:1.1,ease:"power3.out",scrollTrigger:{trigger:item,start:"top 90%",once:true}});
   });
  },page);
  return ()=>ctx.revert();
 },[product]);
 return <div className={"story-page story-"+product} ref={page}>
 <div className="story-grain" aria-hidden="true"/>
 <header className="story-nav container-wide"><Brand/>
  <nav aria-label="Product navigation" className={menuOpen?"story-links story-links-open":"story-links"}>
   <Link onClick={()=>setMenuOpen(false)} href="/platform" aria-current={product==="platform"?"page":undefined}>Platform</Link>
   <Link onClick={()=>setMenuOpen(false)} href="/business" aria-current={product==="business"?"page":undefined}>Business</Link>
   <Link onClick={()=>setMenuOpen(false)} href="/send" aria-current={product==="send"?"page":undefined}>Send</Link>
  </nav>
  <Link href="/" className="story-back">Back to home <ArrowUpRight size={15} aria-hidden/></Link>
  <button className="mobile-toggle story-mobile-toggle" aria-label={menuOpen?"Close menu":"Open menu"} aria-expanded={menuOpen} onClick={()=>setMenuOpen(!menuOpen)}>{menuOpen?<X/>:<Menu/>}</button>
 </header>
 <main id="main-content">
  <section className="story-hero container-wide">
   <div className="story-content">
    <span className="section-index story-enter"><span className="signal-dot"/> {data.eyebrow}</span>
    <h1 className="story-enter">{data.word}<br/><em>{data.emph}</em></h1>
    <p className="story-enter">{data.description}</p>
    <div className="story-enter story-hero-actions">
      <a href="#story-perspective" className="story-primary">Explore the experience <ArrowRight size={18}/></a>
      <span className="story-availability"><span/> In development</span>
    </div>
   </div>
   <div className="story-art" role="img" aria-label={"Conceptual illustration for "+data.label+", not a live transaction"}>
    <div className="story-halo"/>
    <div className="story-ring story-ring-outer"/>
    <div className="story-ring story-ring-inner"/>
    <div className="story-orbit-track story-core"><span className="story-orbit-point"/></div>
    <div className="story-shield story-float">{product==="business"?<Layers3 size={42} strokeWidth={1.4}/>:product==="send"?<Globe2 size={42} strokeWidth={1.4}/>:<LockKeyhole size={42} strokeWidth={1.4}/>}</div>
    <div className="story-side-note story-note-one story-float"><ShieldCheck size={15}/> Thoughtful privacy</div>
    <div className="story-side-note story-note-two"><EyeOff size={15}/> Responsible disclosure</div>
    <div className="story-art-caption">{data.label} <span>— Product concept</span></div>
   </div>
  </section>
  <section id="story-perspective" className="story-overview">
   <div className="container-wide">
    <div className="story-section-head story-reveal"><span className="section-index">WHAT WE'RE BUILDING</span><h2>{data.visualTitle}</h2><p>{data.visualSub}</p></div>
    <div className="story-flow story-reveal" aria-label="Illustrative product journey">
     {data.legs.map((name,index)=><div className="story-flow-item" key={name}>
       <span className="flow-index">0{index+1}</span>
       <div className="story-flow-icon">{index===1?<LockKeyhole size={26}/>:index===0?<Layers3 size={26}/>:<Check size={26}/>}</div>
       <strong>{name}</strong>
       {index!==2&&<span className="flow-connector" aria-hidden="true"><ArrowRight size={19}/></span>}
     </div>)}
    </div>
   </div>
  </section>
  <section className="story-chapters container-wide">
   {data.sections.map((section,index)=><article className="story-chapter story-reveal" key={section.number}>
    <span className="story-chapter-number">{section.number}<span>/03</span></span>
    <div><span className="section-index">{section.eyebrow}</span><h2>{section.title}</h2></div>
    <p>{section.description}</p>
   </article>)}
  </section>
  <section className="story-values">
   <div className="container-wide"><div className="story-section-head story-reveal"><span className="section-index">OUR PRODUCT PRINCIPLES</span><h2>Considered at every layer.</h2><p>Designed around the real responsibilities of moving value.</p></div>
    <div className="story-value-grid">{data.features.map(x=><article key={x.index} className="story-reveal"><span>{x.index}</span><h3>{x.title}</h3><p>{x.body}</p></article>)}</div>
   </div>
  </section>
  <section className="story-faq container-wide" aria-labelledby="product-questions">
   <div className="story-section-head story-reveal"><span className="section-index">QUESTIONS WORTH ASKING</span><h2 id="product-questions">Clarity at every step.</h2><p>Know what StealthBridge is building, what privacy can and cannot mean, and what is not yet available.</p></div>
   <div className="story-faq-list">
    {data.faqs.map((item,index)=><details className="story-faq-item story-reveal" key={item.question}>
      <summary><span className="story-faq-index">0{index+1}</span><span>{item.question}</span><ChevronDown size={21} aria-hidden="true"/></summary>
      <p>{item.answer}</p>
    </details>)}
   </div>
  </section>
  <section className="story-ending container-wide story-reveal">
   <div><span className="section-index">STEALTHBRIDGE · LOOKING AHEAD</span><h2>{data.closing}</h2><p>{data.closingSub}</p></div>
   <Link className="story-primary" href={data.nextHref}>{data.nextLabel}<ArrowUpRight size={18}/></Link>
  </section>
 </main>
 <footer className="story-footer container-wide"><Brand/><nav aria-label="Footer navigation"><Link href="/platform">Platform</Link><Link href="/business">Business</Link><Link href="/send">Send</Link><Link href="/">Home</Link></nav><span>Confidential payments. Without borders.</span></footer>
 </div>;
}
