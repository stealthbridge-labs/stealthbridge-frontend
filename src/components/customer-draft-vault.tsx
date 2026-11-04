"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {FileDown,FileUp,LockKeyhole,RefreshCw,ShieldCheck,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {encryptCustomerDraft,decryptCustomerDraft,validCustomerDraft,validEncryptedCustomerDraft,validEncryptedDraftDirectory,type CustomerDraft,type CustomerEncryptedDraftRecord} from "@/lib/private-draft-vault";
const MAX_FILE=6000;
type Props={address:string;draft:CustomerDraft|null;onRestore:(draft:CustomerDraft)=>Promise<void>};
function parseBackup(data:unknown,account:string):{id:string;encrypted:CustomerEncryptedDraftRecord["encrypted"]}{
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Invalid encrypted backup");
 const v=data as Record<string,unknown>;
 if(Object.keys(v).sort().join(",")!=="account_address,encrypted,id,network,schema_version"||
  v.account_address!==account||v.schema_version!==1||v.network!=="testnet"||
  typeof v.id!=="string"||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v.id)||
  !validEncryptedCustomerDraft(v.encrypted))throw Error("Backup is invalid or belongs to another wallet");
 return {id:v.id,encrypted:v.encrypted};
}
async function listVault(account:string):Promise<CustomerEncryptedDraftRecord[]>{
 const response=await fetch("/api/account/drafts",{method:"GET",credentials:"same-origin",cache:"no-store",signal:AbortSignal.timeout(9000)});
 if(!response.ok)throw Error(response.status===503?"Encrypted sync is not enabled on this deployment. You can still create a private backup file.":"Unable to load the encrypted drafts. No drafts were changed.");
 const data:unknown=await response.json();
 if(!validEncryptedDraftDirectory(data,account))throw Error("Vault returned unverified records.");
 return data.drafts;
}
export function CustomerDraftVault({address,draft,onRestore}:Props){
 const [entries,setEntries]=useState<CustomerEncryptedDraftRecord[]>([]);
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [syncAvailable,setSyncAvailable]=useState(false);
 const [deleteConfirm,setDeleteConfirm]=useState(false);
 const fileRef=useRef<HTMLInputElement>(null);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{setEntries(await listVault(address));setSyncAvailable(true);setError("");}
  catch(e){setEntries([]);setSyncAvailable(false);setError(e instanceof Error?e.message:"Vault is unavailable");}
  finally{setLoading(false);}
 },[address]);
 useEffect(()=>{void refresh();},[refresh]);
 async function save(mode:"sync"|"backup"){
  if(!draft||!validCustomerDraft(draft)){setError("Add a valid route, recipient and amount before saving an encrypted draft.");return;}
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const id=crypto.randomUUID();
   const encrypted=await encryptCustomerDraft(address,id,password,draft);
   if(mode==="backup"){
    const bytes=JSON.stringify({schema_version:1,network:"testnet",account_address:address,id,encrypted});
    const url=URL.createObjectURL(new Blob([bytes],{type:"application/json"}));
    try{
     const anchor=document.createElement("a");anchor.href=url;anchor.download=`stealthbridge-encrypted-${id}.json`;
     anchor.click();
    }finally{URL.revokeObjectURL(url);}
    setMessage("Encrypted backup created. Keep the file and passphrase safe; neither can be recovered by StealthBridge.");
   }else{
    const result=await fetch("/api/account/drafts",{method:"PUT",cache:"no-store",credentials:"same-origin",
     headers:{"content-type":"application/json"},body:JSON.stringify({id,expected_revision:0,encrypted})});
    if(result.status===409)throw Error("Vault is full (8 drafts) or the slot changed. Delete an old draft before saving.");
    if(!result.ok)throw Error("Encrypted sync failed; no successful save was confirmed. Use encrypted backup instead.");
    setMessage("Encrypted draft saved. Its recipient, amount and reference are not visible to the storage service.");
    await refresh();
   }
   setPassword("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to encrypt the draft.");}
  finally{setBusy(false);}
 }
 async function restore(id:string,encrypted:CustomerEncryptedDraftRecord["encrypted"]){
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const recovered=await decryptCustomerDraft(address,id,password,encrypted);
   await onRestore(recovered);
   setMessage("Draft restored locally. You must check the recipient and re-review live Testnet route information.");
   setPassword("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to unlock the draft");}
  finally{setBusy(false);}
 }
 async function importBackup(file:File|null){
  if(!file)return;
  if(file.size<1||file.size>MAX_FILE){setError("Encrypted backup exceeds the 6 KB file limit.");return;}
  try{
   const data:unknown=JSON.parse(await file.text());
   const backup=parseBackup(data,address);
   await restore(backup.id,backup.encrypted);
  }catch(e){setError(e instanceof Error?e.message:"Invalid encrypted backup file.");}
 }
 async function remove(item:CustomerEncryptedDraftRecord){
  if(!deleteConfirm||busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const response=await fetch("/api/account/drafts",{method:"DELETE",credentials:"same-origin",cache:"no-store",
    headers:{"content-type":"application/json"},body:JSON.stringify({id:item.id,expected_revision:item.revision})});
   if(response.status===409)throw Error("This draft changed or was removed elsewhere. Refresh and review before deleting.");
   if(!response.ok)throw Error("Unable to delete the encrypted draft.");
   setDeleteConfirm(false);setMessage("Encrypted draft deleted from your StealthBridge account.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Delete failed.");}
  finally{setBusy(false);}
 }
 return <section className="payment-card customer-vault" aria-label="Customer encrypted draft vault">
  <div className="payment-card-heading"><div><span className="payment-eyebrow">Private continuity</span>
   <h2>Save an encrypted payment draft</h2></div><LockKeyhole size={22} aria-hidden/></div>
  <p>Keep unfinished payment details for later. Your browser encrypts them before an optional sync or backup. This is not a transfer, quote, wallet signature or zero-knowledge payment proof.</p>
  <label className="payment-label" htmlFor="draft-vault-password">Vault passphrase</label>
  <input className="payment-input" id="draft-vault-password" type="password" autoComplete="new-password"
   maxLength={256} value={password} onChange={e=>setPassword(e.target.value)}
   placeholder="At least 14 characters"/>
  <p className="payment-hint">Use a long, unique passphrase. StealthBridge cannot reset it or decrypt a lost backup. Your passphrase never leaves this tab.</p>
  <div className="customer-vault-actions">
   <Button size="sm" variant="outline" type="button" disabled={busy||!syncAvailable||!draft||entries.length>=8}
    onClick={()=>void save("sync")}>Save encrypted to account</Button>
   <Button size="sm" variant="outline" type="button" disabled={busy||!draft}
    onClick={()=>void save("backup")}><FileDown size={15} aria-hidden/> Download encrypted backup</Button>
  </div>
  <div className="customer-vault-directory">
   <div className="customer-vault-directory-head"><strong>Encrypted drafts in your account ({entries.length}/8)</strong>
    <Button size="sm" variant="ghost" type="button" onClick={()=>void refresh()} disabled={busy||loading}><RefreshCw size={14} aria-hidden/> Refresh</Button></div>
   {loading?<p role="status">Checking your encrypted vault…</p>:null}
   {!loading&&syncAvailable&&entries.length===0?<p>No saved drafts yet. Only your encrypted backups exist until you save one.</p>:null}
   {entries.map(item=><div className="customer-vault-record" key={item.id}>
    <span><strong>Encrypted draft</strong> <code>{item.id.slice(0,8)}…</code><small>{new Date(item.updated_at_unix*1000).toLocaleString()}</small></span>
    <div><Button size="sm" variant="outline" type="button" disabled={busy} onClick={()=>void restore(item.id,item.encrypted)}>Unlock and restore</Button>
    <Button size="sm" variant="ghost" type="button" disabled={busy||!deleteConfirm}
     onClick={()=>void remove(item)}><Trash2 size={14} aria-hidden/> Delete</Button></div>
   </div>)}
   {entries.length>0?<label className="customer-vault-delete-confirm"><input type="checkbox" checked={deleteConfirm}
    onChange={e=>setDeleteConfirm(e.target.checked)}/> I understand deletion permanently removes the server copy.</label>:null}
  </div>
  <div className="customer-vault-import">
   <label className="payment-label" htmlFor="customer-vault-file"><FileUp size={15} aria-hidden/> Restore an encrypted backup file</label>
   <input ref={fileRef} id="customer-vault-file" type="file" accept=".json,application/json" disabled={busy}
    onChange={e=>{void importBackup(e.target.files?.item(0)??null);e.target.value="";}}/>
  </div>
  {error?<p role="alert" className="payment-field-error">{error}</p>:null}
  {message?<p role="status" className="customer-vault-success"><ShieldCheck size={15} aria-hidden/>{message}</p>:null}
 </section>;
}
