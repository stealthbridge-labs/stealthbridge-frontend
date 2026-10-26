"use client";

import {useState,type FormEvent} from "react";
import {ArrowRight,PencilLine,ShieldAlert,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
 amendPendingBusiness,withdrawPendingBusiness,validBusinessApplicationName,
 type PendingBusinessApplication
} from "@/lib/business-onboarding";

export function PendingBusinessActions({
 address,application,onChanged
}:{
 address:string;application:PendingBusinessApplication;
 onChanged:(message:string)=>void;
}){
 const [mode,setMode]=useState<"closed"|"edit"|"withdraw">("closed");
 const [newName,setNewName]=useState(application.display_name);
 const [confirmation,setConfirmation]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 function open(next:"closed"|"edit"|"withdraw"){
  if(busy)return;
  setMode(next);
  setError("");
  setNewName(application.display_name);
  setConfirmation("");
 }
 async function save(event:FormEvent){
  event.preventDefault();
  if(busy||!validBusinessApplicationName(newName)||
   newName===application.display_name)return;
  setBusy(true);setError("");
  try{
   await amendPendingBusiness(address,application.id,application.display_name,newName);
   onChanged("Application name corrected. Rechecking your saved applications.");
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Unable to save this change.");
  }finally{setBusy(false);}
 }
 async function withdraw(event:FormEvent){
  event.preventDefault();
  if(busy||confirmation!==application.display_name)return;
  setBusy(true);setError("");
  try{
   await withdrawPendingBusiness(address,application.id,confirmation);
   onChanged("Pending application withdrawn. Checking your updated application list.");
  }catch(cause){
   setError(cause instanceof Error?cause.message:"Unable to withdraw the application.");
  }finally{setBusy(false);}
 }
 return <div className="pending-business-actions">
  {mode==="closed"?<div className="pending-business-actions-controls">
   <Button type="button" size="sm" variant="outline" onClick={()=>open("edit")}>
    <PencilLine size={15} aria-hidden/> Correct application name
   </Button>
   <Button type="button" size="sm" variant="outline" onClick={()=>open("withdraw")}>
    <Trash2 size={15} aria-hidden/> Withdraw
   </Button>
  </div>:null}
  {mode==="edit"?<form onSubmit={event=>void save(event)} className="pending-business-actions-form">
   <label htmlFor={"rename-"+application.id}>Correct organization name</label>
   <input id={"rename-"+application.id} autoComplete="organization" maxLength={120}
    value={newName} required onChange={event=>setNewName(event.target.value)}/>
   <p>Only an untouched, pending owner application can be corrected. A newer change will not be overwritten.</p>
   <div className="pending-business-actions-controls">
    <Button size="sm" type="submit" disabled={busy||!validBusinessApplicationName(newName)||
     newName===application.display_name}>
     {busy?"Saving…":"Save corrected name"} <ArrowRight size={15} aria-hidden/>
    </Button>
    <Button size="sm" type="button" variant="outline" disabled={busy}
     onClick={()=>open("closed")}>Cancel</Button>
   </div>
  </form>:null}
  {mode==="withdraw"?<form onSubmit={event=>void withdraw(event)} className="pending-business-actions-form pending-business-danger">
   <div className="pending-business-warning"><ShieldAlert size={20} aria-hidden/>
    <p><strong>Permanent withdrawal.</strong> An unused pending application and its membership record will be deleted. This cannot be undone; active or reviewed organizations cannot be withdrawn here.</p></div>
   <label htmlFor={"withdraw-"+application.id}>Type the exact application name to confirm</label>
   <input id={"withdraw-"+application.id} autoComplete="off" maxLength={120}
    placeholder={application.display_name} value={confirmation} required
    onChange={event=>setConfirmation(event.target.value)}/>
   <div className="pending-business-actions-controls">
    <Button type="submit" size="sm" disabled={busy||confirmation!==application.display_name}>
     {busy?"Withdrawing…":"Permanently withdraw application"}
    </Button>
    <Button type="button" size="sm" variant="outline" disabled={busy}
     onClick={()=>open("closed")}>Keep application</Button>
   </div>
  </form>:null}
  {error?<p className="pending-business-error" role="alert">{error}</p>:null}
 </div>;
}
