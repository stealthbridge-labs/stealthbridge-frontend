"use client";

import Link from "next/link";
import {useEffect,useRef,useState} from "react";
import {ArrowRight,FileSpreadsheet,LockKeyhole,RefreshCw,ShieldCheck,Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {
 parseBusinessBatchCsv,loadBusinessCorridorBatch,assessBusinessBatch,
 type BusinessBatchDraft,type CorridorBatch
} from "@/lib/business-batch";
import {loadBusinessCorridorBatchPreflight,matchingCorridorBatches,type CorridorBatchPreflight} from "@/lib/business-batch-preflight";

const HEADER="corridor_id,recipient,amount,reference";
type State="idle"|"loading"|"reviewed"|"unavailable";
export function BusinessBatchPlanner(){
 const [input,setInput]=useState(HEADER);
 const [draft,setDraft]=useState<BusinessBatchDraft|null>(null);
 const [coverage,setCoverage]=useState<CorridorBatch|null>(null);
 const [preflight,setPreflight]=useState<CorridorBatchPreflight|null>(null);
 const [state,setState]=useState<State>("idle");
 const [error,setError]=useState<string|null>(null);
 const controller=useRef<AbortController|null>(null);
 const revision=useRef(0);
 useEffect(()=>()=>{controller.current?.abort();revision.current++;},[]);
 const update=(value:string)=>{
  controller.current?.abort();revision.current++;
  setInput(value);setDraft(null);setCoverage(null);setPreflight(null);setState("idle");setError(null);
 };
 const importCsv=async(file:File|undefined)=>{
  if(!file)return;
  const ticket=++revision.current;
  controller.current?.abort();
  setDraft(null);setCoverage(null);setPreflight(null);setState("idle");setError(null);
  if(file.size===0||file.size>32768||!file.name.toLowerCase().endsWith(".csv")){
   setError("Choose a .csv file no larger than 32 KB. Nothing was imported.");return;
  }
  try{
   // Read in this tab only. File contents are never posted or stored.
   const text=await file.text();
   if(ticket!==revision.current)return;
   parseBusinessBatchCsv(text);
   update(text);
  }catch(error){
   if(ticket===revision.current)setError(error instanceof Error?
    error.message:"The selected file could not be read.");
  }
 };
 const review=async()=>{
  controller.current?.abort();
  const current=++revision.current;
  const ctl=new AbortController();controller.current=ctl;
  setDraft(null);setCoverage(null);setPreflight(null);setState("loading");setError(null);
  let parsed:BusinessBatchDraft;
  try{
   parsed=parseBusinessBatchCsv(input);
  }catch(e){
   setError(e instanceof Error?e.message:"The CSV cannot be reviewed.");
   setState("idle");return;
  }
  // No CSV contents, recipient, reference, amount or wallet identity is sent.
  setDraft(parsed);
  try{
   const [verified,live]=await Promise.all([
    loadBusinessCorridorBatch(parsed.routeIds,ctl.signal),
    loadBusinessCorridorBatchPreflight(parsed.routeIds,ctl.signal)
   ]);
   if(!matchingCorridorBatches(verified,live.batch))
    throw Error("The public route configuration changed between live checks.");
   if(ctl.signal.aborted||revision.current!==current)return;
   setCoverage(verified);setPreflight(live);setState("reviewed");
  }catch(error){
   if(ctl.signal.aborted||revision.current!==current)return;
   setState("unavailable");
   const known=error instanceof Error&&
    /^(The public route configuration changed|Live batch preflight |The public corridor batch )/.test(error.message);
   setError(known?error.message:
    "The live operator catalog could not be verified. Review has not succeeded.");
  }
 };
 const assessment=draft&&coverage?assessBusinessBatch(draft,coverage):null;
 const routes=new Map(coverage?.items.map(item=>[item.id,item])??[]);
 return <section className="batch-workspace" aria-labelledby="batch-workspace-heading">
  <div className="batch-hero">
   <div className="batch-kicker"><FileSpreadsheet size={17} aria-hidden/> BUSINESS OPERATIONS / LOCAL REVIEW</div>
   <h1 id="batch-workspace-heading">One workspace. Many payments to plan.</h1>
   <p>Prepare up to 50 draft instructions and review up to eight configured cross-border corridors together. No bank connection, transaction submission or custody required.</p>
   <div className="batch-hero-links">
    <Link href="/app/business">Back to business <ArrowRight size={16} aria-hidden/></Link>
    <Link href="/routes">Explore public corridors <ArrowRight size={16} aria-hidden/></Link>
   </div>
  </div>
  <div className="batch-grid">
   <div className="batch-panel">
    <div className="batch-panel-head">
     <span className="batch-number">01</span>
     <div><h2>Prepare payment instructions</h2>
      <p>Paste a CSV below. The first row must contain these four columns in this order:</p>
     </div>
    </div>
    <code className="batch-header">{HEADER}</code>
    <label htmlFor="batch-csv" className="batch-label">CSV instructions — stored in this browser tab only</label>
    <textarea id="batch-csv" value={input} onChange={event=>update(event.target.value)}
     maxLength={32768} rows={10} spellCheck={false} autoComplete="off"
     placeholder={HEADER}
     aria-describedby="batch-csv-help" className="batch-textarea"/>
    <p id="batch-csv-help" className="batch-help">Use canonical lowercase corridor IDs from the public catalog, Stellar G-address recipients, plain decimal amounts (up to 7 fractional digits), and unique references (3–64 characters). Maximum 50 rows, eight corridors and 32 KB. Do not include bank details or sensitive notes.</p>
    <label htmlFor="batch-import" className="batch-label">Or import a CSV from this device</label>
    <input id="batch-import" type="file" accept=".csv,text/csv"
     className="batch-file-input" onChange={event=>{
      const file=event.currentTarget.files?.[0];
      event.currentTarget.value="";
      void importCsv(file);
     }}/>
    <p className="batch-help">Files are read locally in this browser tab. Only the public corridor IDs are used for later server checks.</p>
    <div className="batch-actions">
     <Button type="button" disabled={state==="loading"||input===HEADER}
      onClick={()=>void review()}><RefreshCw size={16} aria-hidden/> Check configured corridors</Button>
     <Button type="button" variant="outline" onClick={()=>update(HEADER)}>
      <Trash2 size={16} aria-hidden/> Clear drafts</Button>
    </div>
    {error?<p role="alert" className="batch-error">{error}</p>:null}
    <p className="batch-privacy"><LockKeyhole size={16} aria-hidden/>
      Only public corridor UUIDs leave the browser. Draft recipient addresses, amounts and references are not sent, saved or signed.</p>
   </div>
   <aside className="batch-panel batch-review" aria-labelledby="batch-review-heading">
    <div className="batch-panel-head">
     <span className="batch-number">02</span>
     <div><h2 id="batch-review-heading">Live route review</h2><p>Source-backed metadata, not a quote or settlement instruction.</p></div>
    </div>
    {state==="idle"?<div className="batch-empty">Enter one or more draft rows to check whether their public routes are configured.</div>:null}
    {state==="loading"?<div role="status" className="batch-empty">Checking actual Testnet corridor records…</div>:null}
    {state==="unavailable"?<div role="alert" className="batch-empty">Route verification is unavailable. No readiness result is being claimed.</div>:null}
    {assessment?<div>
     <div className="batch-counts" role="status">
      <div><strong>{assessment.totalRows}</strong><span>Draft instructions</span></div>
      <div><strong>{assessment.configuredRows}</strong><span>Rows with catalog records</span></div>
      <div><strong>{assessment.unconfiguredRows}</strong><span>Rows without catalog records</span></div>
     </div>
     {preflight?<div className="batch-system-readiness" role="status">
      <strong>Independent live infrastructure checks</strong>
      <dl>
       <div><dt>Stellar Testnet observation</dt><dd>{preflight.network_fresh?
        "Fresh · ledger "+preflight.ledger_sequence?.toLocaleString():"Stale or unavailable"}</dd></div>
       <div><dt>Platform database schema</dt><dd>{preflight.database_schema_ready?
        "Required migrations present":"Incomplete or unavailable"}</dd></div>
       <div><dt>Read-only dependencies</dt><dd>{preflight.read_only_dependencies_ready?
        "Operational for metadata reads":"Degraded — not ready"}</dd></div>
      </dl>
      <p>Observed {new Date(preflight.observed_at_unix*1000).toLocaleString()}.
       These are informational checks, not permission to move money.</p>
     </div>:null}
     <p className="batch-honesty"><ShieldCheck size={18} aria-hidden/>
      Route records are only public metadata. Liquidity, asset precision, provider support, FX rates, compliance, privacy proofs and actual settlement remain unverified.</p>
    </div>:null}
    <div className="batch-financial-lock">
     <LockKeyhole size={21} aria-hidden/>
     <div><strong>Financial execution unavailable</strong>
      <span>This planner cannot transfer funds, authorize a payout, sign a transaction or reserve a rate.</span></div>
    </div>
   </aside>
  </div>
  {draft&&coverage?<section className="batch-results" aria-label="Validated local instruction rows">
   <div className="batch-results-heading"><h2>Draft instruction review</h2>
    <p>{draft.rows.length} locally validated row{draft.rows.length===1?"":"s"}. No execution or quote is available.</p></div>
   <div className="batch-table-scroll">
    <table><thead><tr><th scope="col">#</th><th scope="col">Corridor</th>
     <th scope="col">Recipient (masked)</th><th scope="col">Draft amount</th>
     <th scope="col">Reference</th><th scope="col">Catalog</th></tr></thead>
     <tbody>{draft.rows.map((row,index)=>{
      const configured=routes.get(row.corridor_id);
      return <tr key={row.reference}><td>{index+1}</td>
       <td>{configured?configured.origin_country+" → "+configured.destination_country+
        " · "+configured.asset_code:row.corridor_id.slice(0,8)+"…"}<small>{row.corridor_id.slice(0,8)}…</small></td>
       <td><code>{row.recipient.slice(0,6)}…{row.recipient.slice(-6)}</code></td>
       <td>{row.amount} <small>draft, unquoted</small></td>
       <td><code>{row.reference}</code></td>
       <td>{configured?"Configured metadata":"Missing / disabled"}</td>
      </tr>;
     })}</tbody>
    </table>
   </div>
  </section>:null}
 </section>;
}
