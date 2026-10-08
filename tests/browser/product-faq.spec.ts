import {expect,test} from "@playwright/test";
for(const route of ["/business","/send","/platform"]){
 test(`${route} questions expand and collapse for keyboard users`,async({page})=>{
  await page.goto(route);
  const question=page.locator("details.story-faq-item").first();
  await expect(question).toBeVisible();
  await expect(question).not.toHaveAttribute("open");
  const summary=question.locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(question).toHaveAttribute("open","");
  const answer=question.locator("p");
  await expect(answer).toBeVisible();
  await expect(answer).toContainText(/not|privacy|Stellar|development|No|require/i);
  await page.keyboard.press("Enter");
  await expect(question).not.toHaveAttribute("open");
 });
}
