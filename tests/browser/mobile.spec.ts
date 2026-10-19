import {expect,test} from "@playwright/test";

test("homepage mobile navigation expands and follows a product link",async({page})=>{
 await page.goto("/");

 const navigation=page.getByRole("navigation",{name:"Main navigation"});
 const open=page.getByRole("button",{name:"Open navigation"});
 await expect(open).toHaveAttribute("aria-expanded","false");
 await expect(navigation).toBeHidden();

 await open.click();
 await expect(page.getByRole("button",{name:"Close navigation"})).toHaveAttribute("aria-expanded","true");
 await expect(navigation).toBeVisible();
 await navigation.getByRole("link",{name:"For business"}).click();
 await expect(page).toHaveURL(/\/business$/);
});

test("product-page mobile navigation expands, collapses, and navigates",async({page})=>{
 await page.goto("/discover/business");

 const navigation=page.getByRole("navigation",{name:"Product navigation"});
 await page.getByRole("button",{name:"Open menu"}).click();
 const close=page.getByRole("button",{name:"Close menu"});
 await expect(close).toHaveAttribute("aria-expanded","true");
 await expect(navigation).toBeVisible();

 await close.click();
 await expect(page.getByRole("button",{name:"Open menu"})).toHaveAttribute("aria-expanded","false");
 await expect(navigation).toBeHidden();

 await page.getByRole("button",{name:"Open menu"}).click();
 await navigation.getByRole("link",{name:"Send",exact:true}).click();
 await expect(page).toHaveURL(/\/send$/);
});
