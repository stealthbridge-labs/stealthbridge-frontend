"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {FileDown,FileUp,LockKeyhole,RefreshCw,ShieldCheck,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {encryptCustomerDraft,decryptCustomerDraft,reencryptCustomerDraft,validCustomerDraft,validEncryptedCustomerDraft,validEncryptedDraftDirectory,type CustomerDraft,type CustomerEncryptedDraftRecord} from "@/lib/private-draft-vault";
const MAX_FILE=6000;
type Props={address:string;draft:CustomerDraft|null;onRestore:(draft:CustomerDraft)=>Promise<void>};
type RestoreSource={id:string;revision:number;encrypted:CustomerEncryptedDraftRecord["encrypted"];origin:"cloud"|"backup"};
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
 const [nextPassword,setNextPassword]=useState("");
 const [confirmNextPassword,setConfirmNextPassword]=useState("");
 const [source,setSource]=useState<RestoreSource|null>(null);
 const currentSource=source?.origin==="cloud"?source:null;
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [syncAvailable,setSyncAvailable]=useState(false);
 const [deleteConfirm,setDeleteConfirm]=useState(false);
 const fileRef=useRef<HTMLInputElement>(null);
 const refresh=useCallback(async()=>{
  setLoading(true);
  try{
   const loaded=await listVault(address);
   setEntries(loaded);setSyncAvailable(true);setError("");
   // If a recovered cloud record was edited on another device, preserve the
   // previous revision so the next update fails with 409 instead of silently
   // overwriting unseen changes. If deleted, clear this stale reference.
   setSource(old=>old?.origin==="cloud"&&!loaded.some(row=>row.id===old.id)?null:old);
  }
  catch(e){setEntries([]);setSyncAvailable(false);setError(e instanceof Error?e.message:"Vault is unavailable");}
  finally{setLoading(false);}
 },[address]);
 useEffect(()=>{void refresh();},[refresh]);
 async function save(mode:"sync"|"backup"){
  if(!draft||!validCustomerDraft(draft)){
   setError("Add a valid route, recipient and amount before saving an encrypted draft.");return;
  }
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const cloud=mode==="sync"&&currentSource;
   // On update, require possession of the prior passphrase and authentic
   // ciphertext before overwriting that particular account-scoped record.
   if(cloud)await decryptCustomerDraft(address,cloud.id,password,cloud.encrypted);
   const id=cloud?cloud.id:crypto.randomUUID();
   const expected_revision=cloud?cloud.revision:0;
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
     headers:{"content-type":"application/json"},body:JSON.stringify({id,expected_revision,encrypted})});
    if(result.status===409)throw Error("Draft changed on another device or vault is full. Refresh before trying again; nothing was overwritten.");
    if(!result.ok)throw Error("Encrypted sync failed; no successful save was confirmed. Use an encrypted backup instead.");
    setSource({id,revision:expected_revision+1,encrypted,origin:"cloud"});
    setMessage(cloud?"Encrypted draft updated safely. Recipient and approvals must still be rechecked.":
     "Encrypted draft saved to your account. Payment contents remain private to your device.");
    await refresh();
   }
   setPassword("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to encrypt the draft.");}
  finally{setBusy(false);}
 }
 async function restore(id:string,encrypted:CustomerEncryptedDraftRecord["encrypted"],revision:number,origin:"cloud"|"backup"){
  if(busy)return;
  setBusy(true);setError("");setMessage("");
  try{
   const recovered=await decryptCustomerDraft(address,id,password,encrypted);
   await onRestore(recovered);
   setSource({id,encrypted,revision,origin});
   setMessage(origin==="backup"?"Encrypted backup restored locally. To sync this copy, explicitly save it to your account using a new slot.":
    "Draft restored locally. You must check the recipient and re-review live Testnet route information.");
   setPassword("");setNextPassword("");setConfirmNextPassword("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to unlock the draft");}
  finally{setBusy(false);}
 }
 /** Re-key a ciphertext in place without putting plaintext in the payment
  * workspace, backend request, logs, or the browser download area. */
 async function rotate(){
  const item=currentSource;
  if(!item||busy)return;
  if(nextPassword!==confirmNextPassword){setError("New passphrases must match before rotation.");return;}
  if(nextPassword===password){setError("Choose a different new passphrase.");return;}
  setBusy(true);setError("");setMessage("");
  try{
   const encrypted=await reencryptCustomerDraft(address,item.id,password,item.encrypted,item.id,nextPassword);
   const result=await fetch("/api/account/drafts",{method:"PUT",cache:"no-store",credentials:"same-origin",
    headers:{"content-type":"application/json"},body:JSON.stringify({id:item.id,expected_revision:item.revision,encrypted})});
   if(result.status===409)throw Error("Another device updated this draft. Refresh before changing the passphrase; no data was overwritten.");
   if(!result.ok)throw Error("Passphrase rotation could not be confirmed. The prior encrypted record remains intact.");
   setSource({id:item.id,revision:item.revision+1,encrypted,origin:"cloud"});
   setPassword("");setNextPassword("");setConfirmNextPassword("");
   setMessage("Vault passphrase changed for this encrypted draft. The previous passphrase no longer unlocks this stored version.");
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:"Passphrase rotation failed.");}
  finally{setBusy(false);}
 }
 async function importBackup(file:File|null){
  if(!file)return;
  if(file.size<1||file.size>MAX_FILE){setError("Encrypted backup exceeds the 6 KB file limit.");return;}
  try{
   const data:unknown=JSON.parse(await file.text());
   const backup=parseBackup(data,address);
   await restore(backup.id,backup.encrypted,0,"backup");
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
   setDeleteConfirm(false);
   if(source?.id===item.id&&source.origin==="cloud")setSource(null);
   setMessage("Encrypted draft deleted from your StealthBridge account.");
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
  <p className="payment-hint">For unlock or update, enter the existing passphrase. For a new draft or backup, choose a long unique one. StealthBridge cannot reset passphrases or decrypt backups. Passwords never leave this tab.</p>
  {source?<p role="status" className="customer-vault-source">{source.origin==="cloud"?
   `Editing saved encrypted draft ${source.id.slice(0,8)}… (revision ${source.revision}). Save will require its existing passphrase.`:
   "Working from an imported encrypted backup. Save to account creates a new encrypted slot; the original backup is unchanged."}
   <Button size="sm" variant="ghost" type="button" disabled={busy} onClick={()=>setSource(null)}>Save as a new draft instead</Button></p>:null}
  <div className="customer-vault-actions">
   <Button size="sm" variant="outline" type="button" disabled={busy||!syncAvailable||!draft||(!currentSource&&entries.length>=8)}
    onClick={()=>void save("sync")}>{currentSource?"Update saved encrypted draft":source?.origin==="backup"?"Save backup as new encrypted draft":"Save encrypted to account"}</Button>
   <Button size="sm" variant="outline" type="button" disabled={busy||!draft}
    onClick={()=>void save("backup")}><FileDown size={15} aria-hidden/> Download encrypted backup</Button>
  </div>
  {currentSource?<div className="customer-vault-rotate" aria-label="Change encrypted draft passphrase">
   <h3>Change this saved draft’s passphrase</h3>
   <p>The old passphrase must unlock the current ciphertext first. Rotation writes a new salt, IV and ciphertext to the same slot using its exact revision. No plaintext is uploaded.</p>
   <label className="payment-label" htmlFor="customer-vault-new-password">New passphrase</label>
   <input className="payment-input" id="customer-vault-new-password" type="password" autoComplete="new-password"
    maxLength={256} value={nextPassword} onChange={e=>setNextPassword(e.target.value)}/>
   <label className="payment-label" htmlFor="customer-vault-confirm-password">Confirm new passphrase</label>
   <input className="payment-input" id="customer-vault-confirm-password" type="password" autoComplete="new-password"
    maxLength={256} value={confirmNextPassword} onChange={e=>setConfirmNextPassword(e.target.value)}/>
   <Button size="sm" variant="outline" type="button" disabled={busy||!password||!nextPassword||!confirmNextPassword}
    onClick={()=>void rotate()}>Change draft passphrase</Button>
  </div>:null}
  <div className="customer-vault-directory">
   <div className="customer-vault-directory-head"><strong>Encrypted drafts in your account ({entries.length}/8)</strong>
    <Button size="sm" variant="ghost" type="button" onClick={()=>void refresh()} disabled={busy||loading}><RefreshCw size={14} aria-hidden/> Refresh</Button></div>
   {loading?<p role="status">Checking your encrypted vault…</p>:null}
   {!loading&&syncAvailable&&entries.length===0?<p>No saved drafts yet. Only your encrypted backups exist until you save one.</p>:null}
   {entries.map(item=><div className="customer-vault-record" key={item.id}>
    <span><strong>Encrypted draft</strong> <code>{item.id.slice(0,8)}…</code><small>{new Date(item.updated_at_unix*1000).toLocaleString()}</small></span>
    <div><Button size="sm" variant="outline" type="button" disabled={busy} onClick={()=>void restore(item.id,item.encrypted,item.revision,"cloud")}>Unlock and restore</Button>
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
