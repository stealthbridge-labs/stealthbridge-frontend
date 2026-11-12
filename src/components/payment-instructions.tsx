"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import Link from "next/link";
import {Clock3,FileLock2,RefreshCw} from "lucide-react";
import {Button} from "@/components/ui/button";
import {encryptCustomerDraft,decryptCustomerDraft,type CustomerDraft} from "@/lib/private-draft-vault";
import {fingerprintInstructionRoute,listPaymentInstructions,savePaymentInstruction,cancelPaymentInstruction,type PaymentInstruction,type PaymentInstructionInput} from "@/lib/payment-instructions";
import type {CustomerCorridor} from "@/lib/customer-corridors";
type Props={address:string;draft?:CustomerDraft|null;route?:CustomerCorridor|null};
export function PaymentInstructions({address,draft=null,route=null}:Props){
 const [rows,setRows]=useState<PaymentInstruction[]>([]);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [available,setAvailable]=useState(false);
 const [password,setPassword]=useState(""),[ttl,setTtl]=useState(86400);
 const [error,setError]=useState(""),[message,setMessage]=useState("");
 const [cancelTarget,setCancelTarget]=useState<string|null>(null);
 const [details,setDetails]=useState<{id:string;draft:CustomerDraft}|null>(null);
 const [clock,setClock]=useState(()=>Math.floor(Date.now()/1000));
 const pending=useRef<{key:string;input:PaymentInstructionInput}|null>(null);
 const epoch=useRef(0);
 const refresh=useCallback(async(signal?:AbortSignal)=>{
  const result=await listPaymentInstructions(address,signal?{signal}:{});
  if(!signal?.aborted){setRows(result.items);setAvailable(true);setError("");setClock(Math.floor(Date.now()/1000));}
  return result.items;
 },[address]);
 useEffect(()=>{
  const ctl=new AbortController();const generation=++epoch.current;
  void listPaymentInstructions(address,{signal:ctl.signal}).then(result=>{if(!ctl.signal.aborted){setRows(result.items);setAvailable(true);setError("");}}).catch(e=>{if(!ctl.signal.aborted)setMessage(e instanceof Error?e.message:"Unable to load instructions.");})
   .finally(()=>{if(!ctl.signal.aborted)setLoading(false);});
  const timer=setInterval(()=>setClock(Math.floor(Date.now()/1000)),15000);
  return ()=>{ctl.abort();clearInterval(timer);epoch.current=generation+1;};
 },[address]);
 async function save(){
  if(!draft||!route||draft.corridor_id!==route.id||busy)return;
  setBusy(true);setError("");setMessage("");const generation=epoch.current;
  try{
   // Keep exactly the same ID and ciphertext after an uncertain response so a
   // retry cannot create another instruction. This cache never leaves memory.
   const key=JSON.stringify([address,draft,route,password,ttl]);
   if(pending.current?.key!==key){
    const id=crypto.randomUUID();
    const encrypted=await encryptCustomerDraft(address,id,password,draft);
    pending.current={key,input:{id,corridor_id:route.id,route_fingerprint:await fingerprintInstructionRoute(route),expires_in_seconds:ttl,encrypted}};
   }
   const input=pending.current.input;
   if(epoch.current!==generation)return;
   await savePaymentInstruction(input);
   const confirmed=await refresh();
   if(epoch.current!==generation)return;
   if(!confirmed.some(row=>row.id===input.id))throw Error("Save was acknowledged but the instruction could not be verified. Refresh before trying again.");
   pending.current=null;setPassword("");setMessage("Encrypted instruction saved to your account. No payment was authorized or submitted.");
  }catch(e){if(epoch.current===generation)setError(e instanceof Error?e.message:"Instruction save could not be verified.");}
  finally{if(epoch.current===generation)setBusy(false);}
 }
 async function unlock(row:PaymentInstruction){
  if(busy)return;setBusy(true);setError("");setDetails(null);const generation=epoch.current;
  try{
   const recovered=await decryptCustomerDraft(address,row.id,password,row.encrypted);
   if(recovered.corridor_id!==row.corridor_id)throw Error("Encrypted instruction does not match its public route record.");
   if(epoch.current===generation){setDetails({id:row.id,draft:recovered});setPassword("");}
  }catch(e){if(epoch.current===generation)setError(e instanceof Error?e.message:"Unable to unlock instruction.");}
  finally{if(epoch.current===generation)setBusy(false);}
 }
 async function cancel(row:PaymentInstruction){
  if(busy||cancelTarget!==row.id)return;setBusy(true);setError("");setMessage("");const generation=epoch.current;
  try{
   await cancelPaymentInstruction(row.id,row.revision);const confirmed=await refresh();
   if(epoch.current!==generation)return;
   if(!confirmed.some(v=>v.id===row.id&&v.state==="cancelled"))throw Error("Cancellation was acknowledged but could not be verified. Refresh your records.");
   setCancelTarget(null);setMessage("Instruction cancelled. Its saved record remains in your history.");
  }catch(e){if(epoch.current===generation)setError(e instanceof Error?e.message:"Cancellation could not be verified.");}
  finally{if(epoch.current===generation)setBusy(false);}
 }
 return <section className="payment-card instruction-workspace" aria-label="Saved payment instructions">
  <div className="payment-card-heading"><div><span className="payment-eyebrow">Payment preparation</span><h2>Your payment instructions</h2></div><FileLock2 size={22} aria-hidden/></div>
  <p>Keep an encrypted instruction with an expiry and cancellation history. Signing in lets you manage these records; it does not give StealthBridge permission to spend.</p>
  <p className="payment-hint">Recipient, amount and reference stay encrypted. StealthBridge can see your public account, selected route and record timing. Keep your passphrase safe; it cannot be reset.</p>
  <label className="payment-label" htmlFor="instruction-password">Instruction passphrase</label>
  <input className="payment-input" id="instruction-password" type="password" autoComplete="new-password" maxLength={256} disabled={busy}
   value={password} onChange={e=>{setPassword(e.target.value);pending.current=null;}} placeholder="At least 14 characters"/>
  {draft&&route?<div className="instruction-create">
   <label className="payment-label" htmlFor="instruction-expiry">Keep this instruction valid for</label>
   <select className="payment-input" id="instruction-expiry" value={ttl} disabled={busy} onChange={e=>setTtl(Number(e.target.value))}>
    <option value={3600}>One hour</option><option value={86400}>One day</option>
   </select>
   <Button type="button" disabled={busy||loading||!available||password.length<14||rows.length>=50} onClick={()=>void save()}>Save payment instruction</Button>
   <p className="payment-hint">Save the reviewed details as an immutable record. To change them, prepare a new instruction. Business records belong to this account and do not represent team approval.</p>
  </div>:<p className="payment-hint">To create an instruction, <Link href="/app/send">prepare and review payment details</Link> first. You can view and cancel saved records here.</p>}
  <Button type="button" variant="outline" size="sm" disabled={busy||loading} onClick={()=>{setLoading(true);void refresh().catch(e=>{setAvailable(false);setError(e instanceof Error?e.message:"Refresh failed.");}).finally(()=>setLoading(false));}}><RefreshCw size={15} aria-hidden/> Refresh instructions</Button>
  {loading?<p role="status">Loading your saved instructions…</p>:null}
  {error?<p role="alert" className="state-error">{error}</p>:null}
  {message?<p role="status">{message}</p>:null}
  {!loading&&available&&!error&&rows.length===0?<div className="instruction-empty"><Clock3 size={20} aria-hidden/><p>No payment instructions saved yet.</p></div>:null}
  <ul className="instruction-list">{rows.map(row=>{
   const status=row.state==="saved"&&clock>=row.expires_at_unix?"expired":row.state;
   return <li key={row.id}>
    <div className="instruction-row-heading"><strong>Instruction {row.id.slice(0,8)}</strong><span className="instruction-state">{status}</span></div>
    <dl><div><dt>Created</dt><dd><time dateTime={new Date(row.created_at_unix*1000).toISOString()}>{new Date(row.created_at_unix*1000).toLocaleString()}</time></dd></div>
     <div><dt>Expires</dt><dd><time dateTime={new Date(row.expires_at_unix*1000).toISOString()}>{new Date(row.expires_at_unix*1000).toLocaleString()}</time></dd></div>
     {row.cancelled_at_unix?<div><dt>Cancelled</dt><dd>{new Date(row.cancelled_at_unix*1000).toLocaleString()}</dd></div>:null}</dl>
    <div className="customer-vault-actions"><Button type="button" variant="outline" size="sm" disabled={busy||password.length<14} onClick={()=>void unlock(row)}>Unlock details</Button>
     {status==="saved"?<Button type="button" variant="ghost" size="sm" disabled={busy||!available} onClick={()=>setCancelTarget(row.id)}>Cancel instruction</Button>:null}</div>
    {cancelTarget===row.id&&status==="saved"?<div role="group" aria-label="Confirm instruction cancellation"><p>Cancel this saved instruction? Its record will remain in your history.</p>
     <Button type="button" variant="danger" size="sm" disabled={busy} onClick={()=>void cancel(row)}>Confirm cancellation</Button>
     <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={()=>setCancelTarget(null)}>Keep instruction</Button></div>:null}
    {details?.id===row.id?<div className="instruction-details"><h3>Unlocked on this device</h3><dl>
     <div><dt>Recipient</dt><dd>{details.draft.recipient}</dd></div><div><dt>Entered amount</dt><dd>{details.draft.amount}</dd></div>
     {details.draft.reference?<div><dt>Reference</dt><dd>{details.draft.reference}</dd></div>:null}</dl>
     <Button type="button" variant="ghost" size="sm" onClick={()=>setDetails(null)}>Hide details</Button></div>:null}
   </li>;
  })}</ul>
  <p className="payment-hint">Up to 50 records per account in this Testnet release. Saved instructions are not quotes, signed transfers, private on-chain payments or payout receipts.</p>
 </section>;
}
