// Screenshot a local HTML file: node scripts/shot-html.mjs in.html out.png [width]
import { chromium } from "playwright-core";
import { resolve } from "node:path";

const [input, output, width = "1200"] = process.argv.slice(2);
if (!input || !output) {
  console.error("usage: node scripts/shot-html.mjs in.html out.png [width]");
  process.exit(1);
}
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 800 }, deviceScaleFactor: 1.5 });
await page.goto(`file://${resolve(input)}`);
await page.waitForTimeout(300);
await page.screenshot({ path: output, fullPage: true });
await browser.close();
