import {expect,test} from "@playwright/test";

const publicRoutes=[
 {path:"/",title:/StealthBridge \| Confidential payments/,heading:"Move value. Not exposure."},
 {path:"/business",title:/StealthBridge Business/,heading:"Confidentiality means business."},
 {path:"/send",title:/StealthBridge Send/,heading:"Close to home. Across borders."},
 {path:"/platform",title:/StealthBridge Platform/,heading:"More than a payment rail."}
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
  await expect(page.locator("body")).not.toContainText(/(?:USD|EUR|GBP)\s*[=→]\s*\d|[$€£]\s*\d[\d,.]*/);
 });
}

test("unknown routes use the branded recovery page",async({page})=>{
 const response=await page.goto("/not-a-public-product");

 expect(response?.status()).toBe(404);
 await expect(page.getByRole("heading",{level:1,name:"Something new is taking shape."})).toBeVisible();
 await expect(page.getByRole("link",{name:"StealthBridge Business"})).toHaveAttribute("href","/business");
 await expect(page.getByRole("link",{name:"StealthBridge Send"})).toHaveAttribute("href","/send");
 await expect(page.getByRole("link",{name:"Back to home"})).toHaveAttribute("href","/");
});
