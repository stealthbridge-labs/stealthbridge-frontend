"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Activity,ArrowLeft,BookOpen,Code2,RefreshCw,ShieldAlert} from "lucide-react";
import {Brand} from "@/components/brand";
import {Button} from "@/components/ui/button";
import {readBridge,readPlatformModules} from "@/lib/bridge-api";
import type {Capabilities,ContractDiscovery,NetworkStatus,ServiceReadiness} from "@/lib/bridge-api";
import type {PlatformCatalog} from "@/lib/platform-modules";
import {assessDeveloperReadiness,type DeveloperReadiness} from "@/lib/developer-readiness";

const example=[
 'import { StealthBridgeClient } from "@stealthbridge/sdk";',
 '',
 'const client = new StealthBridgeClient({',
 '  apiBaseUrl: "https://YOUR-TESTNET-API",',
 '  network: "testnet",',
 '});',
 '// Observation only; no payment signing or submission methods.',
 'const [catalog, capabilities] = await Promise.all([',
 '  client.platformModules(),',
 '  client.capabilities(),',
 ']);',
 'console.log(catalog.modules, capabilities);',
].join("\n");

const businessExample=[
 'import { readBusinessReviewStatus } from "@stealthbridge/sdk";',
 '',
 '// Run only in a trusted authenticated backend context.',
 '// IDs and ephemeral session come from independently verified login.',
 'const review = await readBusinessReviewStatus({',
 '  apiBaseUrl: backendTestnetOrigin,',
 '  network: "testnet",',
 '  organization: authorizedOrganizationId,',
 '  requestId: requestedReviewId,',
 '  bearerToken: ephemeralOrganizationReadSession,',
 '});',
 'console.log(review.review_count, review.remaining_reviewers);',
 '// A reviewer count is never transfer authority.',
].join("\\n");

export function DeveloperWorkspace(){
 const [revision,setRevision]=useState(0);
 const [view,setView]=useState<{loading:boolean;assessment:DeveloperReadiness|null}>({
  loading:true,assessment:null,
 });
 useEffect(()=>{
  const abort=new AbortController();
  const settle=<T,>(result:PromiseSettledResult<T>):T|null=>
   result.status==="fulfilled"?result.value:null;
  void Promise.allSettled([
   readBridge<NetworkStatus>("network",abort.signal),
   readBridge<ServiceReadiness>("ready",abort.signal),
   readBridge<Capabilities>("capabilities",abort.signal),
   readPlatformModules(abort.signal),
   readBridge<ContractDiscovery>("contracts",abort.signal),
  ] as const).then(([network,readiness,capabilities,catalog,contracts])=>{
   if(abort.signal.aborted)return;
   setView({loading:false,assessment:assessDeveloperReadiness({
    network:settle(network),readiness:settle(readiness),
    capabilities:settle(capabilities),
    catalog:settle<PlatformCatalog>(catalog),contracts:settle(contracts),
   },Math.floor(Date.now()/1000))});
  });
  return ()=>abort.abort();
 },[revision]);
 const state=view.assessment;
 return <div className="workspace-page preview-home">
  <header className="workspace-header">
   <Brand/>
   <span className="network-chip"><i aria-hidden="true"/> Stellar Testnet · Read only</span>
   <Link href="/preview" className="back-link"><ArrowLeft size={16} aria-hidden/> Workspace</Link>
  </header>
  <main id="main-content" className="workspace-main">
   <div className="workspace-intro">
    <span className="section-index">StealthBridge / Developer infrastructure</span>
    <h1>Integrate with evidence, not assumptions.</h1>
    <p>Diagnose real Testnet API dependencies, inspect source-only contracts, and try typed
    read endpoints. Missing observations remain unavailable; no funds can move through this workspace.</p>
   </div>
   <div className="preview-home-toolbar">
    <p role="status" aria-live="polite" data-testid="developer-verdict">
     {view.loading?"Checking connected services…":state?.verdict==="read-only-ready"?
      "Read-only developer discovery is available. Payments are disabled.":state?.verdict==="unsafe-claim"?
      "Conflicting capability or network claim detected. Do not trust this integration.":
      "One or more Testnet dependencies are unverified or unavailable."}
    </p>
    <Button type="button" variant="outline" size="sm" disabled={view.loading}
      onClick={()=>{setView({loading:true,assessment:null});setRevision(x=>x+1);}}>
      <RefreshCw size={16} aria-hidden/> Rerun checks
    </Button>
   </div>
   <section aria-label="Developer integration checks">
    <h2 className="preview-hub-title">Integration preflight</h2>
    <div className="preview-link-grid">
     {(state?.checks??[]).map(check=><article className="preview-link-card" key={check.id}>
      <div className="preview-link-head">
       <Activity size={23} aria-hidden/>
       <span>{check.state==="observed"?"Observed":check.state==="unsafe"?"Unsafe claim":"Unverified"}</span>
      </div>
      <h3>{({
       network:"Stellar network",database:"API dependencies",
       "product-catalog":"Product catalog",soroban:"Soroban status",execution:"Payment controls",
      } as const)[check.id]}</h3>
      <p>{check.detail}</p>
     </article>)}
    </div>
    {!state&&<p>Integration checks have not completed. No service readiness is assumed.</p>}
   </section>
   <div className="registry-boundary">
    <ShieldAlert size={19} aria-hidden/>
    <p>Even a fully observed diagnostic is not authentication, a security audit, deployment
    verification, permission to transfer, or proof of privacy. Wallet signing, payments,
    and fiat payouts remain disabled.</p>
   </div>
   <section aria-label="SDK integration example">
    <h2 className="preview-hub-title"><Code2 size={21} aria-hidden/> Read-only SDK quickstart</h2>
    <p>Reference usage for the source SDK. It does not require a wallet secret or send a transaction.
    Configure a Testnet API origin you control.</p>
    <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",padding:"1.25rem",borderRadius:"1rem",
      background:"var(--color-background-secondary, #0d1823)",color:"#e4edf7",overflowX:"auto",
      fontSize:"0.82rem",lineHeight:1.7}}><code>{example}</code></pre>
    <h3>Authenticated business review status (server-side)</h3>
    <p>This SDK reader is not exposed through the marketing proxy. It requires a
    previously verified short-lived organization session, the matching tenant UUID,
    and a reviewed API origin. No public session-issuance flow is enabled yet.</p>
    <pre style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere",padding:"1.25rem",borderRadius:"1rem",
      background:"var(--color-background-secondary, #0d1823)",color:"#e4edf7",overflowX:"auto",
      fontSize:"0.82rem",lineHeight:1.7}}><code>{businessExample}</code></pre>
    <Link href="/preview/modules" className="back-link"><BookOpen size={16} aria-hidden/> Explore all product modules</Link>
   </section>
  </main>
  <footer className="workspace-footer">StealthBridge · Developer preview · No transaction execution</footer>
 </div>;
}
