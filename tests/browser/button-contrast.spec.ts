import {expect,test} from "@playwright/test";
const pages=["/","/business","/send","/platform"];
function luminance(rgb:number[]){
 const f=(v:number)=>{const x=v/255;return x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4;};
 return 0.2126*f(rgb[0])+0.7152*f(rgb[1])+0.0722*f(rgb[2]);
}
function ratio(a:number[],b:number[]){
 const l1=luminance(a),l2=luminance(b);return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
}
function parseRgb(value:string){
 const parts=value.match(/[\d.]+/g);
 if(!parts||parts.length<3)throw new Error("Unrecognized CSS color "+value);
 return parts.slice(0,3).map(Number);
}
for(const path of pages){
 test(`${path} CTA contrast and focus are legible`,async({page})=>{
  await page.goto(path);
  const ctas=page.locator(path==="/"?'.hero-buttons [data-slot="button"],.closing-panel [data-slot="button"]':'.story-primary');
  const count=await ctas.count();
  expect(count).toBeGreaterThan(0);
  for(let i=0;i<count;i++){
   const link=ctas.nth(i);
   await expect(link).toBeVisible();
   const styles=await link.evaluate(el=>{
    const c=getComputedStyle(el);
    const icon=el.querySelector("svg");
    return {color:c.color,background:c.backgroundColor,height:el.getBoundingClientRect().height,
      iconColor:icon?getComputedStyle(icon).stroke:null};
   });
   expect(styles.background,"CTA must have a solid background").toMatch(/^rgb\(/);
   expect(ratio(parseRgb(styles.color),parseRgb(styles.background))).toBeGreaterThanOrEqual(4.5);
   expect(styles.height,"CTA should have a usable tap target").toBeGreaterThanOrEqual(44);
   if(styles.iconColor)expect(styles.iconColor).toBe(styles.color);
  }
 });
}
test("homepage mint CTA remains readable after hover and keyboard focus",async({page})=>{
 await page.goto("/");
 const cta=page.locator(".hero-buttons [data-slot=button]").first();
 await cta.hover();
 const styles=await cta.evaluate(el=>({text:getComputedStyle(el).color,bg:getComputedStyle(el).backgroundColor}));
 expect(ratio(parseRgb(styles.text),parseRgb(styles.bg))).toBeGreaterThanOrEqual(4.5);
 await cta.focus();
 await expect(cta).toBeFocused();
});
