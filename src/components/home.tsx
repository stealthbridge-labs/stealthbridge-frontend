"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowRight, ShieldCheck, LockKeyhole, Globe2, Layers3, Menu, X, Sparkles, MoveDownRight, Waypoints, Fingerprint } from "lucide-react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import gsap from "gsap";
import { Brand } from "./brand";
import { Button } from "./ui/button";
export function Home(){
 const root=useRef<HTMLDivElement>(null);
 const [mobileMenu,setMobileMenu]=useState(false);
 useEffect(()=>{
  if(!mobileMenu)return;
  const handleKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setMobileMenu(false);};
  window.addEventListener("keydown",handleKey);
  return ()=>window.removeEventListener("keydown",handleKey);
 },[mobileMenu]);
 const [rail,setRail]=useState<"business"|"send">("business");
 useEffect(()=>{
  if(!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  const ctx=gsap.context(()=>{
    const intro=gsap.timeline({defaults:{ease:"power3.out"}});
    intro.fromTo(".site-header",{opacity:0,y:-20},{opacity:1,y:0,duration:.8})
      .fromTo(".hero-reveal",{opacity:0,y:54,filter:"blur(12px)"},{opacity:1,y:0,filter:"blur(0px)",stagger:.13,duration:1.05},-.4)
      .fromTo(".routing-board",{opacity:0,y:50,rotateY:10,scale:.94},{opacity:1,y:0,rotateY:-5,scale:1,duration:1.35,ease:"power4.out"},-.8)
      .fromTo(".floating-receipt",{opacity:0,x:-32,y:18},{opacity:1,x:0,y:0,duration:1},-.35)
      .fromTo(".rail-drawing",{strokeDasharray:600,strokeDashoffset:600},{strokeDashoffset:0,duration:1.8,stagger:.19,ease:"power2.inOut"},-.95);
    gsap.to(".ambient-halo",{scale:1.14,opacity:.7,duration:4.7,repeat:-1,yoyo:true,ease:"sine.inOut"});
    gsap.to(".routing-board",{y:-10,duration:5.5,repeat:-1,yoyo:true,ease:"sine.inOut"});
    gsap.to(".floating-receipt",{y:-14,duration:3.8,repeat:-1,yoyo:true,ease:"sine.inOut"});
    gsap.to(".signal-dot,.board-live span",{opacity:.35,scale:.85,duration:1.2,repeat:-1,yoyo:true,stagger:.5,ease:"sine.inOut"});
    const pathEls=gsap.utils.toArray<SVGPathElement>(".rail-drawing");
    const packets=gsap.utils.toArray<SVGCircleElement>(".route-packet");
    packets.forEach((packet,index)=>{
      const path=pathEls[index];
      if(path)gsap.to(packet,{motionPath:{path,align:path,alignOrigin:[.5,.5]},duration:3.6+index*.65,delay:1.35+index*.58,repeat:-1,repeatDelay:1.05,ease:"none"});
    });
    gsap.utils.toArray<HTMLElement>(".scroll-rise").forEach((section)=>{
      gsap.fromTo(section,{opacity:0,y:50},{opacity:1,y:0,duration:1.1,ease:"power3.out",
        scrollTrigger:{trigger:section,start:"top 90%",once:true}});
    });
    gsap.utils.toArray<HTMLElement>(".principle-grid article").forEach((item,index)=>{
      gsap.fromTo(item,{opacity:0,y:55,rotateX:7},{opacity:1,y:0,rotateX:0,duration:1,ease:"power3.out",
        delay:index*.1,scrollTrigger:{trigger:".principle-grid",start:"top 85%",once:true}});
    });
  },root);
  return ()=>ctx.revert();
 },[]);
 useEffect(()=>{
  if(!root.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  const item=root.current.querySelector(".product-feature");
  if(!item)return;
  gsap.fromTo(item,{opacity:.65,y:14},{opacity:1,y:0,duration:.55,ease:"power2.out",overwrite:true});
 },[rail]);
 return <div ref={root} className="page-frame">
 <div className="noise" aria-hidden="true"/>
 <header className="site-header container-wide"><Brand/>
 <nav className={mobileMenu?"nav-links nav-open":"nav-links"} aria-label="Main navigation">
 <Link href="/platform" onClick={()=>setMobileMenu(false)}>The platform</Link>
 <Link href="/business" onClick={()=>setMobileMenu(false)}>For business</Link>
 <Link href="/send" onClick={()=>setMobileMenu(false)}>For people</Link>
 <a href="#principles" onClick={()=>setMobileMenu(false)}>Our approach</a>
 </nav>
 <div className="header-actions"><span className="network-chip"><i/> Building on Stellar</span>
 <Link className="nav-cta" href="/platform">Discover the platform <ArrowUpRight size={15}/></Link></div>
 <button className="mobile-toggle" aria-label={mobileMenu?"Close navigation":"Open navigation"} aria-expanded={mobileMenu} onClick={()=>setMobileMenu(!mobileMenu)}>{mobileMenu?<X/>:<Menu/>}</button></header>
 <main id="main-content">
 <section className="hero container-wide">
 <div className="hero-copy">
 <div className="hero-reveal kicker"><span className="signal-dot"/> The next layer of global settlement <span className="kicker-rule"/></div>
 <h1 className="hero-reveal">Move value.<br/><span className="quiet-title">Not exposure.</span></h1>
 <p className="hero-reveal hero-lead">Private by design. Connected by purpose. We’re building cross-border payment experiences that give businesses more control and people more peace of mind.</p>
 <div className="hero-reveal hero-buttons">
 <Button size="lg" asChild><Link href="/business">StealthBridge Business <ArrowUpRight size={17}/></Link></Button>
 <Button size="lg" variant="outline" asChild><Link href="/send">StealthBridge Send <ArrowRight size={17}/></Link></Button>
 </div>
 <div className="hero-reveal hero-note"><ShieldCheck size={16}/><span>In development on Stellar. Payment services are not yet available.</span></div>
 </div>
 <div className="hero-art" role="group" aria-label="Conceptual confidential payment rail diagram, not actual transaction data">
 <div className="ambient-halo"/><div className="orbital orbital-one" aria-hidden="true"/><div className="orbital orbital-two" aria-hidden="true"/>
 <div className="routing-board">
 <div className="board-top"><div><span className="board-eyebrow">Protocol concept</span><strong>A more thoughtful way to move value</strong></div><span className="board-live"><span/> Concept</span></div>
 <div className="board-diagram">
 <div className="route-axis"><span>Origin</span><span>Privacy layer</span><span>Destination</span></div>
 <svg className="routing-svg" viewBox="0 0 580 370" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
 <defs><linearGradient id="route" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#24d6c1" stopOpacity=".07"/><stop offset=".5" stopColor="#5df1d9"/><stop offset="1" stopColor="#70b8ff" stopOpacity=".24"/></linearGradient></defs>
 <path d="M0 175H580M0 90H580M0 260H580" stroke="#ffffff" strokeOpacity=".04"/>
 <ellipse cx="290" cy="181" rx="117" ry="145" fill="#2ae9c1" fillOpacity=".025" stroke="#69e5d2" strokeOpacity=".2" strokeDasharray="4 7"/>
 <path className="rail-drawing" d="M85 100C190 100 170 185 290 185S390 100 495 100" stroke="url(#route)" strokeWidth="2" fill="none" strokeDasharray="260"/>
 <path className="rail-drawing" d="M85 205C190 205 180 185 290 185S390 205 495 205" stroke="url(#route)" strokeWidth="2" fill="none" strokeDasharray="260"/>
 <path className="rail-drawing" d="M85 310C190 310 170 185 290 185S390 310 495 310" stroke="url(#route)" strokeWidth="2" fill="none" strokeDasharray="260"/>
 {[100,205,310].map((y)=><g key={y}><circle cx="85" cy={y} r="6" fill="#4de5ca"/><circle cx="85" cy={y} r="13" stroke="#4de5ca" strokeOpacity=".22" fill="none"/><circle cx="495" cy={y} r="6" fill="#80b9ff"/><circle cx="495" cy={y} r="13" stroke="#80b9ff" strokeOpacity=".22" fill="none"/></g>)}
 {[0,1,2].map(i=><circle key={i} className="route-packet" r="4.5" cx="85" cy={100+i*105} fill={i===1?"#a4fdf4":"#8ee4ff"} opacity=".95" style={{filter:"drop-shadow(0 0 8px #7ffff0)"}}/>)}
 <circle cx="290" cy="185" r="37" fill="#062a31" stroke="#58edcf" strokeOpacity=".6"/><path d="M276 184l10 9 18-21" stroke="#67f1d8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
 </svg>
 <div className="route-labels"><div><div><span>Funding side</span><small>Concept</small></div></div><div><div><span>Receiving side</span><small>Concept</small></div></div></div>
 <div className="privacy-label"><LockKeyhole size={13}/> Protected route</div>
 </div>
 <div className="board-footer"><span><span className="tiny-orb"/> Privacy is a design principle</span><span>Soroban · ZK</span></div>
 </div>
 <div className="floating-receipt"><div className="floating-icon"><LockKeyhole size={17}/></div><div><span>Illustrative private amount</span><strong>••••••••</strong></div><span className="receipt-tag">Concept</span></div>
 </div>
 </section>
 <section id="infrastructure" className="trust-strip"><div className="container-wide trust-inner"><span>OUR FOUNDATIONS</span><strong>Purpose-built privacy</strong><strong>Borderless ambition</strong><strong>Thoughtful compliance</strong><strong>Open infrastructure</strong></div></section>
 <section id="products" className="products-section container-wide scroll-rise"><div className="section-heading"><div><span className="section-index">The platform</span><h2>One infrastructure.<br/>Two ways to move value.</h2></div><p>One vision, two distinct experiences. Designed around the needs of institutions and the people who move money internationally.</p></div>
 <div className="product-switch" role="group" aria-label="Product preview"><button aria-pressed={rail==="business"} onClick={()=>setRail("business")} className={rail==="business"?"selected":""}>Business settlement</button><button aria-pressed={rail==="send"} onClick={()=>setRail("send")} className={rail==="send"?"selected":""}>Personal remittance</button></div>
 <div className="product-feature"><div className="feature-text"><div className="feature-icon">{rail==="business"?<Layers3 size={24}/>:<Globe2 size={24}/>}</div><h3>{rail==="business"?"Confidentiality for business-critical payments.":"A quieter way to send money home."}</h3><p>{rail==="business"?"A future settlement workspace where businesses can manage cross-border transactions with clearer oversight, thoughtful privacy boundaries, and transparent payment progress.":"A future remittance experience centered on people—designed for clarity, dignity, and more control over the information shared during cross-border transfers."}</p><Link href={rail==="business"?"/business":"/send"} className="text-link">Discover StealthBridge {rail==="business"?"Business":"Send"} <ArrowUpRight size={17}/></Link></div><div className="feature-visual"><span className="diagram-caption">PRODUCT CONCEPT · NOT LIVE PAYMENT DATA</span><div className="demo-path"><div className="path-node"><span>{rail==="business"?"Institution A":"Sender"}</span><strong>Origin</strong></div><div className="path-line"><i/><small>Privacy rail</small></div><div className="path-node shielded"><LockKeyhole/><span>Privacy layer</span></div><div className="path-line"><i/></div><div className="path-node"><span>{rail==="business"?"Institution B":"Recipient"}</span><strong>Destination</strong></div></div><div className="diagram-bottom"><span>Visible infrastructure</span><span>Protected information</span></div></div></div></section>
 <section id="principles" className="principles-section"><div className="container-wide"><div className="section-heading"><div><span className="section-index">Built with restraint</span><h2>Privacy you can reason about.</h2></div><p>Progress without shortcuts. Privacy and trustworthy settlement require both powerful technology and real-world operational care.</p></div><div className="principle-grid"><article><ShieldCheck/><h3>Auditable by design</h3><p>Building toward clear payment stages, responsible oversight, and information access that is appropriate to the task.</p></article><article><LockKeyhole/><h3>Protected where it matters</h3><p>Exploring different privacy approaches for business amounts and personal payment relationships.</p></article><article><Sparkles/><h3>Interoperable from day one</h3><p>A modular foundation designed to grow across payment corridors and partners without starting again.</p></article></div></div></section>
 <section className="closing-section container-wide scroll-rise"><div className="closing-panel"><div><span className="section-index">THE NEXT CHAPTER OF PAYMENTS</span><h2>The future of payments<br/>doesn't need an audience.</h2></div><Button asChild size="lg"><Link href="/platform">Get to know StealthBridge <ArrowUpRight size={17}/></Link></Button></div></section>
 </main><footer className="site-footer container-wide"><Brand/><p>Confidential payments. Without borders.</p><div className="footer-links"><Link href="/business">Business</Link><Link href="/send">Send</Link><Link href="/platform">Platform</Link></div><span>© {new Date().getFullYear()} StealthBridge · Building for what’s next</span></footer>
 </div>;
}
