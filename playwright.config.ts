import {defineConfig} from "@playwright/test";

const port=3199;
const baseURL=`http://127.0.0.1:${port}`;

export default defineConfig({
 testDir:"./tests/browser",
 outputDir:"test-results",
 fullyParallel:false,
 forbidOnly:!!process.env.CI,
 retries:process.env.CI?2:0,
 workers:1,
 timeout:30_000,
 expect:{timeout:5_000},
 reporter:process.env.CI?[["line"],["html",{open:"never"}]]:[["list"],["html",{open:"never"}]],
 use:{
  baseURL,
  browserName:"chromium",
  trace:"retain-on-failure",
  screenshot:{mode:"only-on-failure",fullPage:true}
 },
 projects:[
  {
   name:"chromium-desktop",
   testMatch:[/public-routes\.spec\.ts/,/desktop\.spec\.ts/,/safety-gates\.spec\.ts/],
   use:{viewport:{width:1440,height:900}}
  },
  {
   name:"chromium-mobile",
   testMatch:[/public-routes\.spec\.ts/,/mobile\.spec\.ts/,/safety-gates\.spec\.ts/],
   use:{viewport:{width:390,height:844},isMobile:true,hasTouch:true}
  },
  {
   name:"chromium-reduced-motion",
   testMatch:/reduced-motion\.spec\.ts/,
   use:{viewport:{width:1280,height:800},reducedMotion:"reduce"}
  }
 ],
 webServer:{
  command:`npm run start -- --hostname 127.0.0.1 --port ${port}`,
  url:baseURL,
  reuseExistingServer:false,
  timeout:120_000,
  stdout:"pipe",
  stderr:"pipe",
  env:{
   STEALTHBRIDGE_SITE_MODE:process.env.STEALTHBRIDGE_TEST_PREVIEW==="1"?"preview":"landing",
   STEALTHBRIDGE_API_URL:""
  }
 }
});
