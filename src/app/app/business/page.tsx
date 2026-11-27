import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowRight,Building2,FileSpreadsheet,LockKeyhole,SquarePen,UsersRound} from "lucide-react";
import {requireWalletIdentity} from "@/lib/auth-server";
import {AccountOrganizations} from "@/components/account-organizations";
import {BusinessOnboarding} from "@/components/business-onboarding";
import {BusinessOverview} from "@/components/business-overview";
import {TeamInvitations} from "@/components/team-invitations";
import {PageHeader} from "@/components/app/page-header";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Your business workspace — StealthBridge",
 robots:{index:false,follow:false}};
export default async function AppBusiness({
 searchParams
}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const identity=await requireWalletIdentity();
 const params=await searchParams;
 const route=params.corridor;
 if(Object.keys(params).length===1&&typeof route==="string"&&
  /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(route))
   redirect("/app/business/payments?corridor="+route.toLowerCase());
 return <div className="sb-page">
  <PageHeader eyebrow="Business" title="Your business, across borders." description="Your organization, people and payment preparation in one place. Start with your workspace, then plan single or batch payments."/>
  <div className="sb-alert" data-tone="info" role="note"><LockKeyhole size={18} aria-hidden/>
   <span><strong>Onboarding and planning only.</strong> Registration does not verify a business. Settlement, transfers and payouts stay disabled until independent checks are complete.</span>
  </div>
  <BusinessOverview address={identity.address}/>
  <section aria-labelledby="business-tools-title" className="sb-section">
   <div className="sb-section-head"><h2 id="business-tools-title" className="sb-section-title">What would you like to do?</h2></div>
   <div className="sb-grid-2 business-hub-action-grid">
    <Link href="#business-onboarding" className="sb-card sb-row-button business-hub-action" style={{display:"flex",gap:14,alignItems:"center",textDecoration:"none"}}>
     <span className="sb-row-icon"><Building2 size={19} aria-hidden/></span>
     <span className="sb-row-main"><strong>Set up an organization</strong><span>Register a pending business workspace and review its status.</span></span><ArrowRight size={17} aria-hidden style={{color:"var(--sb-ink-3)"}}/>
    </Link>
    <Link href="#business-organizations" className="sb-card sb-row-button business-hub-action" style={{display:"flex",gap:14,alignItems:"center",textDecoration:"none"}}>
     <span className="sb-row-icon"><UsersRound size={19} aria-hidden/></span>
     <span className="sb-row-main"><strong>People and access</strong><span>View real memberships, roles and invitations.</span></span><ArrowRight size={17} aria-hidden style={{color:"var(--sb-ink-3)"}}/>
    </Link>
    <Link href="/app/business/payments" className="sb-card sb-row-button business-hub-action" style={{display:"flex",gap:14,alignItems:"center",textDecoration:"none"}}>
     <span className="sb-row-icon"><SquarePen size={19} aria-hidden/></span>
     <span className="sb-row-main"><strong>Prepare one payment</strong><span>Choose a configured route and privately review local draft details.</span></span><ArrowRight size={17} aria-hidden style={{color:"var(--sb-ink-3)"}}/>
    </Link>
    <Link href="/app/business/batch" className="sb-card sb-row-button business-hub-action" style={{display:"flex",gap:14,alignItems:"center",textDecoration:"none"}}>
     <span className="sb-row-icon"><FileSpreadsheet size={19} aria-hidden/></span>
     <span className="sb-row-main"><strong>Plan a payment batch</strong><span>Validate several local draft instructions against live route metadata.</span></span><ArrowRight size={17} aria-hidden style={{color:"var(--sb-ink-3)"}}/>
    </Link>
   </div>
  </section>
  <div id="business-onboarding" className="sb-section"><BusinessOnboarding address={identity.address}/></div>
  <div id="business-organizations" className="sb-section">
   <AccountOrganizations address={identity.address}/>
   {process.env.STEALTHBRIDGE_TEAM_INVITES_ENABLED==="true"?
    <TeamInvitations address={identity.address}/>:null}
  </div>
 </div>;
}
