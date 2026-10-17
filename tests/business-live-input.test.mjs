import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("business review preview never seeds fictional accounts or settlement examples",async()=>{
 const ui=await readFile("src/components/business-review-workspace.tsx","utf8");
 assert.doesNotMatch(ui,/FIXTURE_CLOCK|FIXTURE_ORGANIZATION|FICTIONAL_SUBJECT|GMAKER0001|\.repeat\(64\)/);
 assert.match(ui,/useState\(""(?:\)|;)/);
 assert.match(ui,/digestBusinessEnvelope\(/);
 assert.match(ui,/readPlatformModules\(/);
 assert.match(ui,/nothing|No fake|No values are submitted/i);
 assert.doesNotMatch(ui,/signTransaction|submitPayment|sendTransaction/);
});
test("same-origin proxy never forwards private bearer credentials to public endpoints",async()=>{
 const proxy=await readFile("src/app/api/bridge/[...parts]/route.ts","utf8");
 assert.doesNotMatch(proxy,/v1\/business\/reviews|authorization.*_request\.headers|headers\.get\(["']authorization/);
 assert.match(proxy,/new Set\(/);
 assert.match(proxy,/method:"GET"/);
 assert.doesNotMatch(proxy,/export async function POST/);
});
