import Link from "next/link";
import {ArrowRight} from "lucide-react";

/** Shared public-marketing presentation primitives. No live API or payment state. */
export type MarketingProduct="business"|"send"|"platform";

export function ProductNavigation({current,menuOpen,onNavigate}:{
 current:MarketingProduct;menuOpen:boolean;onNavigate:()=>void;
}){
 return <nav data-slot="product-navigation" aria-label="Product navigation"
  className={menuOpen?"story-links story-links-open":"story-links"}>
  <Link onClick={onNavigate} href="/platform" aria-current={current==="platform"?"page":undefined}>Privacy & trust</Link>
  <Link onClick={onNavigate} href="/business" aria-current={current==="business"?"page":undefined}>Business</Link>
  <Link onClick={onNavigate} href="/send" aria-current={current==="send"?"page":undefined}>Send</Link>
 </nav>;
}

export function EditorialSectionHeading({eyebrow,title,description,id}:{
 eyebrow:string;title:string;description:string;id?:string;
}){
 return <div data-slot="editorial-section-heading" className="story-section-head story-reveal">
  <span className="section-index">{eyebrow}</span>
  <h2 id={id}>{title}</h2>
  <p>{description}</p>
 </div>;
}

/** Deliberately says in development, never "available" or settled. */
export function AvailabilityDisclosure(){
 return <span data-slot="product-availability" className="story-availability">
  <span aria-hidden="true"/> In development
 </span>;
}

export function StoryActionGroup(){
 return <div data-slot="story-actions" className="story-enter story-hero-actions">
  <a href="#story-perspective" className="story-primary">
   Explore the experience <ArrowRight size={18} aria-hidden="true"/>
  </a>
  <AvailabilityDisclosure/>
 </div>;
}

export function NarrativeFeatureBlock({index,title,body}:{
 index:string;title:string;body:string;
}){
 return <article data-slot="narrative-feature" className="story-reveal">
  <span>{index}</span>
  <h3>{title}</h3>
  <p>{body}</p>
 </article>;
}
