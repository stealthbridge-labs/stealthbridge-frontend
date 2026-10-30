import {expect,test} from "@playwright/test";

test.use({video:"on"});
const pages=[
 {path:"/",heading:"Money moves. Life stays yours.",selector:".hero-reveal"},
 {path:"/discover/business",heading:"Confidentiality means business.",selector:".story-reveal"},
 {path:"/discover/send",heading:"Close to home. Across borders.",selector:".story-reveal"}
] as const;

for(const entry of pages){
 test(`animation and reduced-motion remain accessible on ${entry.path}`,async({page},info)=>{
  const errors:string[]=[];
  page.on("pageerror",err=>errors.push(err.message));
  await page.goto(entry.path);
  await expect(page.getByRole("heading",{level:1,name:entry.heading})).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  const reduced=info.project.name==="chromium-reduced-motion";
  expect(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(reduced);
  if(reduced){
   const visible=page.locator(entry.selector);
   expect(await visible.count()).toBeGreaterThan(1);
   for(const node of await visible.all()){
    const opacity=await node.evaluate(n=>Number(getComputedStyle(n).opacity));
    expect(opacity).toBeGreaterThanOrEqual(0.99);
   }
   expect(await page.evaluate(()=>document.documentElement.dataset.stealthbridgeGsapTriggers)).toBeUndefined();
  }else{
   await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.stealthbridgeGsapTriggers)).toMatch(/^\d+$/);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
 });
}
