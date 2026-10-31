import type {Metadata} from "next";
import Link from "next/link";
import {redirect} from "next/navigation";
import {ArrowRight,Building2,FileSpreadsheet,LockKeyhole,SquarePen,UsersRound} from "lucide-react";
import {requireWalletIdentity} from "@/lib/auth-server";
import {AccountOrganizations} from "@/components/account-organizations";
import {BusinessOnboarding} from "@/components/business-onboarding";
import {TeamInvitations} from "@/components/team-invitations";
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
 return <>
  <div className="account-heading business-hub-heading"><span className="section-index">STEALTHBRIDGE / BUSINESS</span>
   <h1>Your business, across borders.</h1>
   <p>Manage your organization, people and payment preparation from one place. Start with your business workspace, then plan individual or multiple payments.</p>
  </div>
  <div className="business-hub-banner" role="note"><LockKeyhole size={20} aria-hidden/>
   <div><strong>Business onboarding and planning only</strong>
    <p>Registration does not verify a business. Settlement, transfers and payouts remain disabled until the necessary independent checks are complete.</p>
   </div>
  </div>
  <section aria-labelledby="business-tools-title" className="business-hub-actions">
   <div className="business-hub-section-header"><span className="section-index">YOUR WORKFLOWS</span><h2 id="business-tools-title">What would you like to do?</h2></div>
   <div className="business-hub-action-grid">
    <Link href="#business-onboarding" className="business-hub-action">
     <span className="business-hub-icon"><Building2 size={21} aria-hidden/></span>
     <span><strong>Set up an organization</strong><small>Register a pending business workspace and review its status.</small></span><ArrowRight size={18} aria-hidden/>
    </Link>
    <Link href="#business-organizations" className="business-hub-action">
     <span className="business-hub-icon"><UsersRound size={21} aria-hidden/></span>
     <span><strong>People and access</strong><small>View real memberships, roles and invitations.</small></span><ArrowRight size={18} aria-hidden/>
    </Link>
    <Link href="/app/business/payments" className="business-hub-action">
     <span className="business-hub-icon"><SquarePen size={21} aria-hidden/></span>
     <span><strong>Prepare one payment</strong><small>Choose a configured route and privately review local draft details.</small></span><ArrowRight size={18} aria-hidden/>
    </Link>
    <Link href="/app/business/batch" className="business-hub-action">
     <span className="business-hub-icon"><FileSpreadsheet size={21} aria-hidden/></span>
     <span><strong>Plan a payment batch</strong><small>Validate several local draft instructions against live route metadata.</small></span><ArrowRight size={18} aria-hidden/>
    </Link>
   </div>
  </section>
  <div id="business-onboarding" className="business-hub-section"><BusinessOnboarding address={identity.address}/></div>
  <div id="business-organizations" className="business-hub-section">
   <AccountOrganizations address={identity.address}/>
   {process.env.STEALTHBRIDGE_TEAM_INVITES_ENABLED==="true"?
    <TeamInvitations address={identity.address}/>:null}
  </div>
 </>;
}
