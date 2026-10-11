"use client";
import {useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowUpRight,AlertTriangle,CheckCircle2,Clock3,Search,XCircle} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readTransaction,validTransactionHash,ApiUnavailable,type TransactionObservation} from "@/lib/bridge-api";

export function TransactionExplorer(){
 const [hash,setHash]=useState("");
 const [result,setResult]=useState<TransactionObservation|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [loading,setLoading]=useState(false);
 const controller=useRef<AbortController|null>(null);
 async function verify(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  controller.current?.abort();setResult(null);setError(null);
  const value=hash.trim();
  if(!validTransactionHash(value)){setError("Use exactly 64 hexadecimal characters.");return;}
  const next=new AbortController();controller.current=next;setLoading(true);
  try{
   const found=await readTransaction(value,next.signal);
   if(!next.signal.aborted)setResult(found);
  }catch(e){
   if(!next.signal.aborted)setError(e instanceof ApiUnavailable&&e.status===404
     ?"Not found in this Stellar RPC node's retained history. Check the network or use a historical indexer."
     :e instanceof Error?e.message:"Transaction lookup failed.");
  }finally{if(!next.signal.aborted)setLoading(false);}
 }
 return <div className="workspace-page">
  <header className="workspace-header"><Brand/><span className="network-chip"><i/> Stellar Testnet</span><Link href="/preview" className="back-link">Workspace hub <ArrowUpRight size={15} aria-hidden/></Link><Link className="back-link" href="/preview/contracts">Soroban registry <ArrowUpRight size={15} aria-hidden/></Link><Link className="back-link" href="/"><ArrowLeft size={16}/> Home</Link></header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro"><span className="section-index">StealthBridge / Network intelligence</span><h1>Verify. Don't assume.</h1><p>Look up a real transaction hash on Stellar Testnet. Only blockchain inclusion status is shown—never an invented payment, bank payout or confidential transfer.</p></div>
   <div className="workspace-grid">
    <section className="form-panel" aria-label="Stellar transaction verification">
     <div className="panel-heading"><div><h2>Transaction lookup</h2><span>Read-only · actual Stellar RPC</span></div><Search size={22}/></div>
     <form onSubmit={verify}>
      <label className="field" htmlFor="transaction-hash">Transaction hash</label>
      <input id="transaction-hash" className="tx-input" value={hash} onChange={e=>{setHash(e.target.value);setResult(null);setError(null);}} maxLength={64} spellCheck={false} autoCapitalize="none" autoComplete="off" placeholder="Paste a 64-character hex hash"/>
      <p className="state-muted">Search only transactions you already know. No wallet history or personal information is indexed here.</p>
      <Button className="w-full" type="submit" disabled={loading||!validTransactionHash(hash.trim())}> {loading?"Checking network…":"Check transaction"} <ArrowUpRight size={16}/></Button>
     </form>
     {loading&&<p role="status" className="tx-feedback"><Clock3 size={16}/> Querying actual network status…</p>}
     {error&&<p role="alert" className="state-error tx-feedback"><AlertTriangle size={16}/> {error}</p>}
     {result&&<div className="tx-result" aria-live="polite">
      <h3>{result.status==="SUCCESS"?<CheckCircle2 size={21}/>:<XCircle size={21}/>} {result.status==="SUCCESS"?"Included successfully on-chain":"Transaction execution failed"}</h3>
      <dl>
       <div><dt>Transaction hash</dt><dd className="tx-hex">{result.hash}</dd></div>
       <div><dt>Ledger sequence</dt><dd>{result.ledger.toLocaleString()}</dd></div>
       <div><dt>RPC latest ledger</dt><dd>{result.latest_ledger.toLocaleString()}</dd></div>
       <div><dt>Observation source</dt><dd>Stellar RPC</dd></div>
      </dl>
      <a className="text-link" href={"https://stellar.expert/explorer/testnet/tx/"+result.hash} rel="noopener noreferrer" target="_blank">View public ledger evidence <ArrowUpRight size={16}/></a>
     </div>}
    </section>
    <aside className="insight-panel"><span className="section-index">Verification boundaries</span><h2>What the ledger can tell us.</h2>
     <div className="reliability-list">
      <div><CheckCircle2 size={19}/><div><strong>Chain execution</strong><p>Shows whether a transaction was successfully recorded, or failed, on the configured Testnet RPC.</p></div></div>
      <div><AlertTriangle size={19}/><div><strong>Not a fiat payout receipt</strong><p>An on-chain success cannot confirm an external bank or payout provider fulfilled its obligation.</p></div></div>
      <div><Clock3 size={19}/><div><strong>Historical retention</strong><p>RPC nodes retain a bounded history. Not found does not mean a transaction never existed.</p></div></div>
     </div>
     <div className="insight-note"><AlertTriangle size={17}/><div><strong>Privacy-aware projection</strong><p>This lookup strips raw XDR, contract events and other potentially sensitive metadata rather than reflecting the whole RPC response.</p></div></div>
    </aside>
   </div>
  </main><footer className="workspace-footer">StealthBridge · Live Stellar Testnet information · No transfer execution</footer>
 </div>;
}
