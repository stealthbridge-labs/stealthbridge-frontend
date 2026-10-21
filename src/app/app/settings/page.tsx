import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {CustomerProfileSettings} from "@/components/customer-profile-settings";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Account settings — StealthBridge",robots:{index:false,follow:false}};
export default async function ProfileSettings(){
 const account=await requireWalletIdentity();
 return <>
  <div className="account-heading"><span className="section-index">STEALTHBRIDGE / YOUR SETTINGS</span>
   <h1>Account settings.</h1>
   <p>Your StealthBridge experience, without the complexity of managing infrastructure.</p>
  </div>
  <CustomerProfileSettings address={account.address}/>
 </>;
}
