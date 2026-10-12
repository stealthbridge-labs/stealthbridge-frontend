import {mkdir} from "node:fs/promises";
import path from "node:path";
import {expect,test} from "@playwright/test";

// Marketing-only evidence; no wallet, preview API or settlement traffic.
test.use({video:"on"});
const routes=[
 {path:"/",key:"home",heading:"Move value. Not exposure."},
 {path:"/business",key:"business",heading:"Confidentiality means business."},
 {path:"/send",key:"send",heading:"Close to home. Across borders."},
 {path:"/platform",key:"platform",heading:"More than a payment rail."}
] as const;

for(const entry of routes){
 test(`${entry.key}: animation preferences never hide product content`,async({page},testInfo)=>{
  const failures:string[]=[];
  page.on("pageerror",err=>failures.push(err.message));
  const response=await page.goto(entry.path);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading",{level:1,name:entry.heading})).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  const reduced=await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches);
  expect(reduced).toBe(testInfo.project.name==="chromium-reduced-motion");
  if(reduced){
   const reveal=page.locator(entry.path==="/"?".hero-reveal":".story-reveal");
   const count=await reveal.count();
   expect(count).toBeGreaterThan(1);
   for(const element of await reveal.all()){
    const opacity=await element.evaluate(node=>getComputedStyle(node).opacity);
    expect(Number(opacity),`Reduced-motion text should remain visible on ${entry.path}`).toBeGreaterThanOrEqual(0.99);
   }
   const triggers=await page.evaluate(()=>document.documentElement.dataset.stealthbridgeGsapTriggers);
   expect(triggers).toBeUndefined();
  }else{
   await expect.poll(async()=>page.evaluate(()=>document.documentElement.dataset.stealthbridgeGsapTriggers)).toMatch(/^\d+$/);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  const directory=testInfo.outputPath("motion-evidence");
  await mkdir(directory,{recursive:true});
  await page.screenshot({path:path.join(directory,entry.key+".png"),fullPage:true,animations:"disabled"});
  expect(failures).toEqual([]);
 });
}

test("client-side route changes clean old GSAP ScrollTriggers instead of accumulating them",async({page},testInfo)=>{
 test.skip(testInfo.project.name!=="chromium-desktop","Normal desktop GSAP navigation lifecycle is the reference");
 const exceptions:string[]=[];
 page.on("pageerror",error=>exceptions.push(error.message));
 await page.goto("/business");
 await expect(page.getByRole("heading",{level:1,name:"Confidentiality means business."})).toBeVisible();
 const triggers=async()=>Number(await page.evaluate(()=>document.documentElement.dataset.stealthbridgeGsapTriggers??"-1"));
 await expect.poll(triggers).toBeGreaterThanOrEqual(1);
 const baseline=await triggers();
 for(const [target,heading] of [
  ["Send","Close to home. Across borders."],
  ["Platform","More than a payment rail."],
  ["Business","Confidentiality means business."],
  ["Send","Close to home. Across borders."],
  ["Business","Confidentiality means business."]
 ] as const){
  await page.getByRole("navigation",{name:"Product navigation"}).getByRole("link",{name:target}).click();
  await expect(page.getByRole("heading",{level:1,name:heading})).toBeVisible();
  await expect.poll(triggers).toBeGreaterThanOrEqual(1);
  expect(await triggers(),`Retained GSAP triggers after navigation to ${target}`).toBeLessThanOrEqual(baseline+2);
 }
 expect(exceptions).toEqual([]);
});
