import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL('../src/app/' + name, import.meta.url), "utf8");
const sitemap = read("sitemap.ts");
const robots = read("robots.ts");
const site = read("site-metadata.ts");
const root = read("layout.tsx");
assert.match(site, /https:\/\/stealthbridge\.vercel\.app/);
assert.match(site, /\["\/", "\/business", "\/send", "\/platform"\]/);
assert.match(sitemap, /PUBLIC_ROUTES\.map/);
for (const excluded of ["/preview/", "/explorer", "/api/"]) assert.ok(robots.includes(excluded));
assert.match(root, /metadataBase:/);
assert.match(root, /summary_large_image/);
assert.ok(read("opengraph-image.tsx").includes("ImageResponse"));
for (const route of ["business","send","platform"]) {
 const meta = read(route + "/page.tsx");
 assert.ok(meta.includes('canonical:"/' + route + '"'));
 assert.ok(meta.includes('openGraph:'));
}
for (const internal of ["preview","explorer"]) assert.ok(read(internal+"/layout.tsx").includes("index: false"));
console.log("SEO source assertions passed");
