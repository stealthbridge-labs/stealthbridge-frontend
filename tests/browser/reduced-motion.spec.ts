import {expect,test} from "@playwright/test";

test("reduced motion keeps content visible and interactions usable",async({page})=>{
 await page.goto("/");

 expect(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
 await expect(page.getByRole("heading",{level:1,name:"Move value. Not exposure."})).toBeVisible();
 const products=page.locator("#products");
 await expect(products).toBeVisible();
 await expect(products).toHaveCSS("opacity","1");

 const send=page.getByRole("group",{name:"Product preview"}).getByRole("button",{name:"Personal remittance"});
 await send.click();
 await expect(send).toHaveAttribute("aria-pressed","true");
 const sendLink=page.getByRole("link",{name:"Discover StealthBridge Send"});
 await expect(sendLink).toBeVisible();
 await sendLink.click();
 await expect(page).toHaveURL(/\/send$/);
 await expect(page.getByRole("heading",{level:1,name:"Close to home. Across borders."})).toBeVisible();
});
