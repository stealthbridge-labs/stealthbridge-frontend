import Link from "next/link";
import {ArrowUpRight,ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {AccountLogout} from "@/components/account-logout";
import {AccountNavigation} from "@/components/account-navigation";

export function AccountShell({children}:{address:string;children:React.ReactNode}){
 return <div className="account-page">
  <header className="account-header"><Brand/>
   <div className="account-header-context" aria-hidden="true">Your workspace <span>·</span> Stellar Testnet</div>
   <div className="account-identity"><span aria-label="Signed-in customer account">My account</span><AccountLogout/></div>
  </header>
  <AccountNavigation profilesEnabled={process.env.STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED==="true"}/>
  <main id="main-content" tabIndex={-1} className="account-main">{children}</main>
  <footer className="account-footer"><span><ShieldCheck size={15} aria-hidden/> Your account, your control · Transfers are not enabled yet</span>
   <Link href="/">Explore StealthBridge <ArrowUpRight size={15} aria-hidden/></Link></footer>
 </div>;
}
