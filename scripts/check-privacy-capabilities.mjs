// CI: the privacy centre's capability data must match the canonical lock in
// stealthbridge-contracts (or PRIVACY_LOCK_FILE). Never claims more than the lock.
import { readFile } from "node:fs/promises";

const src = await readFile(new URL("../src/lib/privacy-capabilities.ts", import.meta.url), "utf8");
let lock;
if (process.env.PRIVACY_LOCK_FILE) lock = JSON.parse(await readFile(process.env.PRIVACY_LOCK_FILE, "utf8"));
else {
  const url = "https://raw.githubusercontent.com/stealthbridge-labs/stealthbridge-contracts/main/integrations/privacy-dependency-lock.v2.json";
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`could not read the canonical privacy lock (${res.status})`);
  lock = await res.json();
}
const personal = lock.rails["personal-shielded-pool"];
const business = lock.rails["business-confidential-token"];
const pool = personal.testnetDeployment.contracts.find((c) => c.role === "pool" && c.gvk === "off" && c.asset === "native");
const fail = [];
if (!src.includes(`deploymentCommit: "${personal.upstream.deploymentCommit}"`)) fail.push("personal deploymentCommit drift");
if (!src.includes(`pool: "${pool.id}"`) || !src.includes(`poolWasmSha256: "${pool.wasmSha256}"`)) fail.push("personal pool or code drift");
for (const [name, rail] of [["PERSONAL_RAIL", personal], ["BUSINESS_RAIL", business]]) {
  const m = src.match(new RegExp(`${name} = \\{[\\s\\S]*?verdict: "(GO|NO_GO)"`));
  if (!m || m[1] !== rail.verdict) fail.push(`${name} verdict ${m?.[1]} != lock ${rail.verdict}`);
}
if (fail.length) { console.error("Privacy centre drift from the canonical lock:\n- " + fail.join("\n- ")); process.exit(1); }
console.log(`privacy centre matches the canonical lock: personal ${personal.verdict}, business ${business.verdict}`);
