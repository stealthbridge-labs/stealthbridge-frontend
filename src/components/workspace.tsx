"use client";
import Link from "next/link";
import {useMemo,useState} from "react";
import {ArrowLeft,ArrowRight,AlertTriangle,CheckCircle2,Database,ExternalLink,Globe2,LockKeyhole,RefreshCw,ShieldCheck} from "lucide-react";
import {Brand} from "@/components/brand";
import {WalletConnect} from "@/components/wallet-connect";
import {useBridge} from "@/hooks/use-bridge";
import {Button} from "@/components/ui/button";
import type {PrivacyRail} from "@/lib/bridge-api";

export function Workspace({mode}:{mode:"business"|"send"}){
 const business=mode==="business";
 const rail:PrivacyRail=business?"confidential-token":"private-payments";
 const {network,corridors,capabilities,readiness,observer,refresh,nextCursor,loadingMore,pageError,loadMore}=useBridge();
 const [selected,setSelected]=useState("");
 const [filter,setFilter]=useState("");
 const available=useMemo(()=>corridors.data?.filter(c=>c.privacy_rail===rail && [c.origin_country,c.destination_country,c.asset_code,c.asset_issuer??""].some(v=>v.toLocaleLowerCase().includes(filter.trim().toLocaleLowerCase())))??[],[corridors.data,rail,filter]);
 const corridor=available.find(c=>c.id===selected)??null;
 const formatLedgerTime=(raw:string)=>{const n=Number(raw);if(!Number.isFinite(n))return "Unknown";return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"medium",timeZone:"UTC"}).format(new Date(n*1000))+" UTC";};
 return <div className="workspace-page">
 <header className="workspace-header"><Brand/><span className="network-chip"><i/> Stellar Testnet</span><Link href="/explorer" className="back-link">Network explorer <ArrowRight size={15}/></Link><Link href="/" className="back-link"><ArrowLeft size={16} aria-hidden/> Home</Link></header>
 <main id="main-content" className="workspace-main">
  <div className="workspace-intro">
   <span className="section-index">{business?"StealthBridge / Business":"StealthBridge / Send"}</span>
   <h1>{business?"Confidential settlement, without blind spots.":"Move money, not personal exposure."}</h1>
   <p>{business?"Privacy for settlement amounts between verified institutional counterparties. Explore eligible corridors and inspect the live Stellar network.":"Relationship-private remittances are being integrated against Stellar Private Payments. No payout or private transfer will be offered until the real rail passes testnet verification."}</p>
  </div>
  <div className="workspace-grid">
   <section className="form-panel" aria-label="Network and corridor availability">
    <div className="panel-heading"><div><h2>Corridor availability</h2><span>Operator-configured network records only</span></div><Globe2 size={23} aria-hidden/></div>
    <div className="live-state">
     <span className="live-label">Stellar RPC observation</span>
     {network.loading?<p role="status">Checking network…</p>:network.error?<p className="state-error" role="alert"><AlertTriangle size={17} aria-hidden/> {network.error}</p>:network.data?<div className="live-ledger"><strong>Ledger {network.data.ledger_sequence.toLocaleString()}</strong><span>Protocol {network.data.protocol_version} · Closed {formatLedgerTime(network.data.ledger_closed_at_unix)}</span><a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noreferrer">View Testnet explorer <ExternalLink size={14} aria-hidden/></a></div>:null}
    </div>
    <label className="field" htmlFor="corridor-select">Available {business?"business":"private remittance"} corridor</label>
    <input name="corridor-filter" className="tx-input" type="search" value={filter} onChange={e=>{setFilter(e.target.value);setSelected("");}} placeholder="Search countries, assets or issuer" aria-label="Filter enabled corridors" autoComplete="off"/><select id="corridor-select" name="corridor" autoComplete="off" value={selected} onChange={e=>setSelected(e.target.value)} disabled={corridors.loading||!!corridors.error||available.length===0}>
     <option value="">Select an enabled corridor</option>
     {available.map(c=><option key={c.id} value={c.id}>{c.origin_country} → {c.destination_country} · {c.asset_code}</option>)}
    </select>
    {corridors.loading?<p className="state-muted" role="status">Loading authorized corridor records…</p>:corridors.error?<p className="state-error" role="alert"><AlertTriangle size={17} aria-hidden/>{corridors.error} No corridor information will be fabricated.</p>:available.length===0?<div className="empty-panel"><Database size={22} aria-hidden/><strong>{filter.trim()?"No matching loaded corridors":"No configured corridors yet"}</strong><p>{nextCursor?"More configured records are available; load another page to continue searching.":"Corridors appear here only when operators register and enable actual testnet assets and endpoints. Nothing is prefilled."}</p></div>:null}
    {corridors.data&&<div className="corridor-page-actions">
      <span role="status">{corridors.data.length.toLocaleString()} configured corridor records loaded{nextCursor?" · more available":""}</span>
      {nextCursor&&<Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>{loadingMore?"Loading more…":"Load more corridors"} <ArrowRight size={15} aria-hidden/></Button>}
    </div>}
    {pageError&&<p className="state-error" role="alert"><AlertTriangle size={16} aria-hidden/> {pageError} Existing records remain available.</p>}
    {corridor?<div className="corridor-details"><strong>Selected corridor</strong><p>{corridor.origin_country} → {corridor.destination_country} · {corridor.asset_code}</p><p>Privacy rail: {corridor.privacy_rail}</p>{corridor.asset_issuer?<p>Issuer: <code>{corridor.asset_issuer}</code></p>:null}</div>:null}
    <WalletConnect/>
    <div className="capability-row"><span>Payment initiation</span><strong>{capabilities.loading?"Checking…":capabilities.error?"Unavailable":capabilities.data?.payments_enabled?"Supported":"Not enabled"}</strong></div>
    <Button className="w-full" disabled aria-disabled={true}>Transfer unavailable until protocol verification <ArrowRight size={15} aria-hidden/></Button>
    <p className="demo-disclaimer">No simulated exchange rates, seeded assets, mock settlements, or fictional success statuses are displayed. This screen cannot move funds.</p>
   </section>
   <aside className="insight-panel">
    <span className="section-index">Network transparency</span><h2>Know what the system really supports.</h2>
    <div className="reliability-list">
     <div><ShieldCheck size={19} aria-hidden/><div><strong>Privacy primitive</strong><p>{business?"OpenZeppelin Confidential Tokens":"Stellar Private Payments"}</p><span>{capabilities.data?.[business?"confidential_token_verified":"private_payments_verified"]?"Testnet integration verified":"Integration not yet verified"}</span></div></div>
     <div><LockKeyhole size={19} aria-hidden/><div><strong>Wallet-owned credentials</strong><p>Signing keys remain inside your wallet. This page does not ask for seeds or private proofs.</p></div></div>
     <div><Globe2 size={19} aria-hidden/><div><strong>Actual network data</strong><p>Ledger information is returned by the backend after verification against Stellar Testnet.</p></div></div>
     <div><CheckCircle2 size={19} aria-hidden/><div><strong>Fiat settlement</strong><p>{capabilities.data?.fiat_payouts_enabled?"Provider integration supported":"No licensed payout integrations are enabled."}</p></div></div>
    </div>
    <div className="capability-row"><span>Observation service readiness</span>
     <strong>{readiness.loading?"Checking…":readiness.error?"Degraded or unavailable":readiness.data?.status==="ready"?"Dependencies connected":"Degraded"}</strong>
    </div>
    <p className="state-muted">This measures RPC and database dependencies only—not private transfers, approved issuers, or fiat payouts.</p>
    <div className="observer-card">
      <div className="observer-header"><Database size={18} aria-hidden/><strong>Stored Testnet ledger checkpoint</strong></div>
      {observer.loading?<p role="status">Checking persisted observer…</p>:
        observer.error?<p>Not available: {observer.error} The observer may not be enabled or may not have written its first checkpoint.</p>:
        observer.data?<div className="observer-details"><strong>Ledger {observer.data.ledger_sequence.toLocaleString()}</strong>
          <span>Close time: {formatLedgerTime(observer.data.ledger_closed_at_unix)}</span>
          <span>Source: Stellar RPC (last persisted)</span>
        </div>:null}
      <p>This checkpoint may be stale and is never evidence of a payment or payout.</p>
    </div>

    <Button variant="outline" className="refresh-button" onClick={refresh}><RefreshCw size={16} aria-hidden/> Refresh from backend</Button>
    <div className="insight-note"><AlertTriangle size={18} aria-hidden/><div><strong>Technical preview</strong><p>A successful network check does not establish protected payment availability. Amount privacy and consumer anonymity require separate verified cryptographic implementations.</p></div></div>
   </aside>
  </div>
 </main>
 <footer className="workspace-footer">StealthBridge · Testnet integration stage · No real-value payments</footer>
 </div>;
}
