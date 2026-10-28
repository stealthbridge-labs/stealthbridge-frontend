import Link from "next/link";
import {ArrowUpRight,Building2,FileSpreadsheet,House,Send,ShieldCheck,Settings2} from "lucide-react";
import {Brand} from "@/components/brand";
import {AccountLogout} from "@/components/account-logout";
export function AccountShell({address,children}:{address:string;children:React.ReactNode}){
 return <div className="account-page">
  <header className="account-header"><Brand/>
   <nav aria-label="Workspace navigation" className="account-links">
    <Link href="/app"><House size={17} aria-hidden/> Overview</Link>
    <Link href="/app/send"><Send size={17} aria-hidden/> Transfers</Link>
    <Link href="/app/business"><Building2 size={17} aria-hidden/> Business</Link>
    <Link href="/app/business/batch"><FileSpreadsheet size={17} aria-hidden/> Batch planner</Link>
    {process.env.STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED==="true"?<Link href="/app/settings"><Settings2 size={17} aria-hidden/> Settings</Link>:null}
   </nav>
   <div className="account-identity"><span title={address}>{address.slice(0,6)}…{address.slice(-5)}</span><AccountLogout/></div>
  </header>
  <main id="main-content" className="account-main">{children}</main>
  <footer className="account-footer"><span><ShieldCheck size={15} aria-hidden/> Testnet account access · Signing does not authorize payments</span>
   <Link href="/">Explore StealthBridge <ArrowUpRight size={15} aria-hidden/></Link></footer>
 </div>;
}
