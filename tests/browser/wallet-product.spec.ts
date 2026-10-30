import {expect,test} from "@playwright/test";
test("technical wallet-inspector cannot appear in the customer product",async({page})=>{
 const response=await page.goto("/wallet");
 expect(response?.status()).toBe(404);
 await expect(page.locator("main")).not.toContainText(/operator_local|WASM SHA|Contract ID|deployer/i);
});
test("customer deployment denies raw contract-inspection proxy",async({request})=>{
 const address="CDS6HBE6YJSZTRG3VR2HLCNHWJZMKB43BLFFEHEH3Z76WXAF46LW7JOB";
 const reply=await request.get("/api/public/contract/"+address);
 expect(reply.status()).toBe(404);
 const body=await reply.text();
 expect(body).not.toContain("executable_wasm_hash");
});
test("customer recipient proxy does not accept malformed C-addresses",async({request})=>{
 const reply=await request.get("/api/public/recipient/invalid");
 expect(reply.status()).toBe(400);
});
