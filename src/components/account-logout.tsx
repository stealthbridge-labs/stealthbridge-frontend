"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {LogOut} from "lucide-react";
import {Button} from "@/components/ui/button";
export function AccountLogout(){
 const router=useRouter();const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function logout(){
  setBusy(true);setError("");
  try{
   const response=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin",cache:"no-store"});
   if(!response.ok)throw Error("Unable to sign out. Please try again.");
   router.replace("/login");router.refresh();
  }catch(e){setError(e instanceof Error?e.message:"Unable to sign out.");}
  finally{setBusy(false);}
 }
 return <div className="account-signout"><Button size="sm" variant="outline" disabled={busy}
   type="button" onClick={()=>void logout()}><LogOut size={15} aria-hidden/>{busy?"Signing out…":"Sign out"}</Button>
  {error?<span role="alert">{error}</span>:null}</div>;
}
