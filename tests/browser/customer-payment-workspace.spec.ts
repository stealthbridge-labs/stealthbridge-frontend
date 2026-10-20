import {test,expect} from "@playwright/test";

const status=()=>({
 source:"stealthbridge-public-testnet-read",network:"testnet",
 passphrase:"Test SDF Network ; September 2015",
 ledger_sequence:5300000,ledger_closed_at_unix:String(Math.floor(Date.now()/1000)-5),
 payment_execution_enabled:false,confidential_token_verified:false,
 private_payments_verified:false,fiat_payouts_enabled:false,
 smart_account_deployment_verified:false
});
const corridor={
 id:"9a1a395f-249c-4907-b657-d48df4b38d28",
 origin_country:"NG",destination_country:"GH",asset_code:"USDC",
 asset_issuer:null,privacy_rail:"private-payments"
};
const G="GC3YRVLB7IN7SNUYVWFUC6OD3QWJXCUZ4HOBNIPVGY7BZDVOYMDNX5TN";
test("Send is a customer transfer experience, not a smart-account diagnostic screen",async({page})=>{
 const calls:string[]=[];
 await page.route("**/api/public/status",route=>{calls.push("status");return route.fulfill({json:status()});});
 await page.route("**/api/public/corridors",route=>{calls.push("corridors");return route.fulfill({json:{items:[],next_cursor:null}});});
 await page.goto("/send");
 await expect(page.getByRole("heading",{level:1,name:"Send beyond borders."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"New transfer"})).toBeVisible();
 await expect(page.getByText("No payment corridors are available yet.")).toBeVisible();
 await expect(page.getByRole("button",{name:"Connect Freighter"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Review payment details"})).toBeDisabled();
 await expect(page.getByText("Passkey & smart accounts")).toHaveCount(0);
 expect(calls).toContain("status");expect(calls).toContain("corridors");
});
test("Business uses real configured corridor metadata without inventing payout amounts",async({page})=>{
 const methods:string[]=[];
 page.on("request",req=>{
  if(new URL(req.url()).pathname.startsWith("/api/public/"))methods.push(req.method());
 });
 await page.route("**/api/public/status",route=>route.fulfill({json:status()}));
 await page.route("**/api/public/corridors",route=>route.fulfill({json:{items:[corridor],next_cursor:null}}));
 await page.goto("/business");
 await expect(page.getByRole("heading",{level:1,name:"Your business, across borders."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"Business payment controls"})).toBeVisible();
 await page.getByLabel("Payment route").selectOption(corridor.id);
 await expect(page.getByText("Nigeria")).toBeVisible();
 await expect(page.getByText("Ghana")).toBeVisible();
 await page.getByLabel("Recipient Stellar wallet address").fill(G);
 await page.getByLabel("Amount").fill("250.75");
 await page.getByLabel("Internal payment reference").fill("vendor-invoice-2026");
 await expect(page.getByText("250.75 USDC")).toBeVisible();
 await expect(page.getByText("FX rate")).toBeVisible();
 await expect(page.getByText("Not quoted")).toHaveCount(2);
 await expect(page.getByRole("button",{name:"Submit settlement"})).toBeDisabled();
 await expect(page.getByRole("button",{name:"Review payment details"})).toBeDisabled();
 expect(methods.every(method=>method==="GET")).toBe(true);
});
test("route service errors are not disguised as an empty catalog or successful quote",async({page})=>{
 await page.route("**/api/public/status",route=>route.fulfill({json:status()}));
 await page.route("**/api/public/corridors",route=>route.fulfill({status:503,json:{code:"CORRIDOR_CATALOG_UNAVAILABLE"}}));
 await page.goto("/send");
 await expect(page.getByRole("alert").filter({hasText:"couldn't load payment routes"})).toBeVisible();
 await expect(page.getByRole("button",{name:"Confirm and send"})).toBeDisabled();
 await expect(page.getByText("No payment corridors are available yet.")).toHaveCount(0);
});
