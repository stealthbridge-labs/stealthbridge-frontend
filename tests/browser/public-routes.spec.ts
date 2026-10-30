import {expect,test} from "@playwright/test";

const publicRoutes=[
 {path:"/",title:/StealthBridge \| Confidential payments/,heading:"Money moves. Life stays yours."},
 {path:"/business",title:/StealthBridge Business/,heading:"Confidentiality means business."},
 {path:"/send",title:/StealthBridge Send/,heading:"Close to home. Across borders."},
 {path:"/platform",title:/Privacy & trust/,heading:"Your money is personal. It should feel that way."},
 {path:"/discover/business",title:/StealthBridge Business/,heading:"Confidentiality means business."},
 {path:"/discover/send",title:/StealthBridge Send/,heading:"Close to home. Across borders."}
] as const;

for(const route of publicRoutes){
 test(`${route.path} renders its public product story`,async({page})=>{
  const response=await page.goto(route.path);

  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(route.title);
  await expect(page.getByRole("heading",{level:1,name:route.heading})).toBeVisible();
  await expect(page.getByRole("main")).toMatchAriaSnapshot(`
    - main:
      - heading "${route.heading}" [level=1]
  `);

  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  const destinations=await page.getByRole("link").evaluateAll(links=>links.map(link=>link.getAttribute("href")??""));
  expect(destinations.length).toBeGreaterThan(0);
  for(const destination of destinations){
   expect(destination).not.toMatch(/github\.com|roadmap\.md|\/preview\//i);
  }

  await expect(page.locator("form, input, select")).toHaveCount(0);
  if(["/send","/business"].includes(route.path))await expect(page.getByRole("link",{name:"Sign in to StealthBridge"})).toHaveAttribute("href",route.path==="/send"?"/login?next=/app/send":"/login?next=/app/business");
  await expect(page.locator("body")).not.toContainText(/(?:USD|EUR|GBP)\s*[=→]\s*\d|[$€£]\s*\d[\d,.]*/);
 });
}

test("public route explorer stays wallet-free, shows actual empty state and no made-up pricing",async({page})=>{
 await page.route("**/api/public/corridors*",route=>route.fulfill({
  status:200,json:{items:[],next_cursor:null}
 }));
 const response=await page.goto("/routes");
 expect(response?.status()).toBe(200);
 await expect(page.getByRole("heading",{level:1,name:/Where should your money go next/})).toBeVisible();
 await expect(page.getByRole("heading",{name:"We’re preparing our first payment routes."})).toBeVisible();
 await expect(page.getByRole("heading",{name:"What will my recipient actually receive?"})).toBeVisible();
 await expect(page.getByRole("button",{name:/Check this route/})).toBeVisible();
 await expect(page.getByRole("button",{name:/Connect Freighter|Submit settlement|Confirm and send/})).toHaveCount(0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 expect(overflow).toBeLessThanOrEqual(1);
});
test("public route explorer requests server-filtered real rows and paginates without claiming a quote",async({page})=>{
 const row={id:"9a1a395f-249c-4907-b657-d48df4b38d28",
  origin_country:"NG",destination_country:"GH",asset_code:"USDC",asset_issuer:null,
  privacy_rail:"private-payments"};
 const second={...row,id:"b3a295f4-0a37-4da4-94c2-38f2f0ee5729",asset_code:"EURC"};
 const urls:string[]=[];
 await page.route("**/api/public/corridors*",async route=>{
  const url=new URL(route.request().url());
  urls.push(url.search);
  await route.fulfill({status:200,json:url.searchParams.has("after")?
   {items:[second],next_cursor:null}:{items:[row],next_cursor:row.id}});
 });
 await page.goto("/routes");
 await expect(page.getByRole("heading",{name:"NG to GH"})).toBeVisible();
 await expect(page.getByText("Pricing and transfers are not open on this route yet.")).toBeVisible();
 await page.getByLabel("Sending from").selectOption("NG");
 await page.getByLabel("Receiving in").selectOption("GH");
 await page.getByRole("button",{name:/Check this route/}).click();
 await expect(page).toHaveURL(/origin_country=NG.*destination_country=GH/);
 await expect(page.getByRole("heading",{name:"NG to GH"})).toBeVisible();
 await page.getByRole("button",{name:/Load more routes/}).click();
 await expect(page.getByText("EURC")).toBeVisible();
 expect(urls).toContain("?origin_country=NG&destination_country=GH");
 expect(urls.some(query=>query.includes("after="))).toBe(true);
 await expect(page.getByRole("button",{name:/Submit settlement|Confirm and send/})).toHaveCount(0);
});
test("a real public corridor links into signed-in Send without leaking payment details",async({page})=>{
 const id="9a1a395f-249c-4907-b657-d48df4b38d28";
 await page.route("**/api/public/corridors*",route=>route.fulfill({
  json:{items:[{id,origin_country:"NG",destination_country:"GH",
   asset_code:"USDC",asset_issuer:null,privacy_rail:"private-payments"}],next_cursor:null}
 }));
 await page.goto("/routes");
 const link=page.getByRole("link",{name:"Review personal transfer"});
 await expect(link).toBeVisible();
 const href=await link.getAttribute("href");
 expect(href).not.toContain("amount");
 expect(href).not.toContain("recipient");
 expect(new URL(href!,"http://localhost").searchParams.get("next"))
  .toBe("/app/send?corridor="+id);
 await link.click();
 await expect(page).toHaveURL(/\/login\?next=/);
 await expect(page.getByRole("heading",{name:/Your world of payments/})).toBeVisible();
});
test("business payment intent survives sign-in as a public corridor ID only",async({page})=>{
 const id="9a1a395f-249c-4907-b657-d48df4b38d28";
 await page.route("**/api/public/corridors*",route=>route.fulfill({
  json:{items:[{id,origin_country:"NG",destination_country:"GH",asset_code:"USDC",
   asset_issuer:null,privacy_rail:"confidential-token"}],next_cursor:null}
 }));
 await page.goto("/routes");
 await page.getByRole("button",{name:"For my business"}).click();
 await expect(page.getByRole("button",{name:"For my business"})).toHaveAttribute("aria-pressed","true");
 const link=page.getByRole("link",{name:"Review for my business"});
 const href=await link.getAttribute("href");
 const dest=new URL(href!,"https://stealthbridge.example").searchParams.get("next");
 expect(dest).toBe("/app/business?corridor="+id);
 expect(href).not.toMatch(/recipient|amount|name|reference|privacy_rail/i);
 await link.click();
 await expect(page).toHaveURL(/\/login\?next=/);
});
test("public filtered catalog rejects unknown, duplicated, or malformed query fields",async({request})=>{
 for(const value of ["?origin_country=ng","?origin_country=NGA",
  "?origin_country=NG&origin_country=GH","?privacy_rail=already-verified",
  "?amount=100","?destination_country=%3Cscript%3E"]){
  const response=await request.get("/api/public/corridors"+value);
  expect(response.status(),value).toBe(400);
 }
});
test("route explorer transparently distinguishes backend failure from no configured routes",async({page})=>{
 await page.route("**/api/public/corridors*",route=>route.fulfill({
  status:503,json:{code:"CORRIDOR_CATALOG_UNAVAILABLE"}
 }));
 await page.goto("/routes?origin_country=NG");
 await expect(page.getByRole("heading",{name:"We can't verify routes right now."})).toBeVisible();
 await expect(page.getByText(/We won't show made-up availability or rates/)).toBeVisible();
 await expect(page.getByRole("heading",{name:/We’re preparing our first payment routes/})).toHaveCount(0);
});
test("protocol release record is not a public product page",async({request})=>{
 const response=await request.get("/protocol");
 expect(response.status()).toBe(404);
});

test("unknown routes use the branded recovery page",async({page})=>{
 const response=await page.goto("/not-a-public-product");

 expect(response?.status()).toBe(404);
 await expect(page.getByRole("heading",{level:1,name:"Something new is taking shape."})).toBeVisible();
 await expect(page.getByRole("link",{name:"StealthBridge Business"})).toHaveAttribute("href","/business");
 await expect(page.getByRole("link",{name:"StealthBridge Send"})).toHaveAttribute("href","/send");
 await expect(page.getByRole("link",{name:"Back to home"})).toHaveAttribute("href","/");
});

test("production marketing hides every technical preview and its read-only proxy",async({request})=>{
 for(const route of ["/preview","/preview/business","/preview/send","/preview/contracts","/preview/governance","/preview/upgrades","/wallet","/explorer"]){
  const result=await request.get(route);
  expect(result.status(),route+" must be unavailable on marketing").toBe(404);
 }
 const read=await request.get("/api/bridge/v1/network");
 expect(read.status()).toBe(404);
 const write=await request.post("/api/bridge/v1/settlements",{data:{}});
 expect(write.status()).toBe(405);
});
