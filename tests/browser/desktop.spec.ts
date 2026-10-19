import {expect,test} from "@playwright/test";

test("homepage navigation and calls to action use product destinations",async({page})=>{
 await page.goto("/");

 await expect(page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"The platform"})).toHaveAttribute("href","/platform");
 await expect(page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"For business"})).toHaveAttribute("href","/business");
 await expect(page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"For people"})).toHaveAttribute("href","/send");
 await expect(page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"Our approach"})).toHaveAttribute("href","#principles");
 await expect(page.getByRole("link",{name:"Discover the platform"})).toHaveAttribute("href","/platform");
 await expect(page.getByRole("link",{name:"StealthBridge Business",exact:true})).toHaveAttribute("href","/business");
 await expect(page.getByRole("link",{name:"StealthBridge Send",exact:true})).toHaveAttribute("href","/send");

 await page.getByRole("link",{name:"StealthBridge Business",exact:true}).click();
 await expect(page).toHaveURL(/\/business$/);
});

for(const route of [
 {path:"/discover/business",current:"Business",next:"Explore our approach",destination:"/platform"},
 {path:"/discover/send",current:"Send",next:"Discover StealthBridge Business",destination:"/business"},
 {path:"/platform",current:"Platform",next:"Explore StealthBridge Business",destination:"/business"}
] as const){
 test(`${route.path} exposes its real product navigation`,async({page})=>{
  await page.goto(route.path);

  const navigation=page.getByRole("navigation",{name:"Product navigation"});
  await expect(navigation.getByRole("link",{name:route.current,exact:true})).toHaveAttribute("aria-current","page");
  await expect(page.getByRole("link",{name:"Explore the experience"})).toHaveAttribute("href","#story-perspective");
  await expect(page.getByRole("link",{name:route.next})).toHaveAttribute("href",route.destination);
  await expect(page.getByRole("link",{name:"Back to home"})).toHaveAttribute("href","/");
 });
}

test("keyboard focus is visible and activates navigation",async({page})=>{
 await page.goto("/");

 await page.keyboard.press("Tab");
 const skipLink=page.getByRole("link",{name:"Skip to main content"});
 await expect(skipLink).toBeFocused();
 await expect(skipLink).toBeVisible();

 await page.keyboard.press("Tab");
 await expect(page.getByRole("banner").getByRole("link",{name:"StealthBridge home"})).toBeFocused();
 await page.keyboard.press("Tab");
 const platformLink=page.getByRole("navigation",{name:"Main navigation"}).getByRole("link",{name:"The platform"});
 await expect(platformLink).toBeFocused();
 const focusStyle=await platformLink.evaluate(element=>{
  const style=getComputedStyle(element);
  return {style:style.outlineStyle,width:Number.parseFloat(style.outlineWidth)};
 });
 expect(focusStyle.style).not.toBe("none");
 expect(focusStyle.width).toBeGreaterThanOrEqual(2);

 await page.keyboard.press("Enter");
 await expect(page).toHaveURL(/\/platform$/);
});

test("product selector supports pointer and keyboard interaction",async({page})=>{
 await page.goto("/");

 const selector=page.getByRole("group",{name:"Product preview"});
 const business=selector.getByRole("button",{name:"Business settlement"});
 const send=selector.getByRole("button",{name:"Personal remittance"});
 await expect(business).toHaveAttribute("aria-pressed","true");
 await expect(send).toHaveAttribute("aria-pressed","false");

 await send.focus();
 await page.keyboard.press("Space");
 await expect(send).toHaveAttribute("aria-pressed","true");
 await expect(page.getByRole("heading",{level:3,name:"A quieter way to send money home."})).toBeVisible();
 await expect(page.getByRole("link",{name:"Discover StealthBridge Send"})).toHaveAttribute("href","/send");

 await business.click();
 await expect(business).toHaveAttribute("aria-pressed","true");
 await expect(page.getByRole("heading",{level:3,name:"Confidentiality for business-critical payments."})).toBeVisible();
});
