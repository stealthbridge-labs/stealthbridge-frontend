import {mkdir} from "node:fs/promises";
import path from "node:path";
import {expect,test} from "@playwright/test";

const productPages=[
 {route:"/business",name:"Business"},
 {route:"/send",name:"Send"},
 {route:"/platform",name:"Platform"}
] as const;

for(const product of productPages){
 test(`${product.name} uses accessible reusable marketing primitives`,async({page},testInfo)=>{
  const errors:string[]=[];
  page.on("pageerror",error=>errors.push(error.message));
  const response=await page.goto(product.route);
  expect(response?.status()).toBe(200);
  // Small viewports intentionally hide the navigation until the accessible toggle opens it.
  if(testInfo.project.name==="chromium-mobile"){
   const menu=page.getByRole("button",{name:"Open menu"});
   await expect(menu).toBeVisible();
   await menu.click();
   await expect(page.getByRole("button",{name:"Close menu"})).toHaveAttribute("aria-expanded","true");
  }
  const navigation=page.getByRole("navigation",{name:"Product navigation"});
  await expect(navigation).toHaveCount(1);
  await expect(navigation).toHaveAttribute("data-slot","product-navigation");
  await expect(navigation.getByRole("link",{name:product.name}))
   .toHaveAttribute("aria-current","page");
  await expect(page.locator('[data-slot="editorial-section-heading"]')).toHaveCount(3);
  await expect(page.locator('[data-slot="story-actions"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="product-availability"]')).toHaveCount(1);
  await expect(page.locator('[data-slot="narrative-feature"]')).toHaveCount(3);
  await expect(page.locator('[data-slot="product-availability"]')).toContainText("In development");
  const action=page.getByRole("link",{name:/Explore the experience/});
  await expect(action).toHaveAttribute("href","#story-perspective");
  await action.focus();
  await expect(action).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#story-perspective$/);
  const screenshotDir=testInfo.outputPath("marketing-primitives");
  await mkdir(screenshotDir,{recursive:true});
  await page.screenshot({path:path.join(screenshotDir,product.name.toLowerCase()+".png"),fullPage:true,animations:"disabled"});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
 });
}
