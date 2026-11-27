import type {Metadata} from "next";
import {requireWalletIdentity} from "@/lib/auth-server";
import {redirect} from "next/navigation";
import {CustomerProfileSettings} from "@/components/customer-profile-settings";
import {AccountAccessSecurity} from "@/components/account-access-security";
import {PageHeader} from "@/components/app/page-header";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Account settings — StealthBridge",robots:{index:false,follow:false}};
export default async function ProfileSettings(){
 const account=await requireWalletIdentity();
 if(process.env.STEALTHBRIDGE_CUSTOMER_PROFILE_ENABLED!=="true")redirect("/app");
 return <div className="sb-page sb-legacy">
  <PageHeader eyebrow="Account" title="Account settings." description="Your name and preferences, and how you sign in and approve payments."/>
  <section className="sb-section" aria-label="Preferences"><CustomerProfileSettings address={account.address}/></section>
  <section className="sb-section" aria-label="Sign-in and security"><AccountAccessSecurity key={account.address} address={account.address}/></section>
 </div>;
}
