import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
];
const executablePath = chromeCandidates.find(existsSync);
if (!executablePath) throw new Error("Chrome/Edge was not found. Set a browser path in scripts/smoke.mjs.");

const outputDir = path.resolve(process.cwd(), "../../work/browser-qa");
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();

try {
  await page.goto("http://127.0.0.1:3000/", { waitUntil: "networkidle" });
  const nickname = page.locator("#nickname");
  if (await nickname.isVisible()) {
    await nickname.fill("浏览器测试猫");
    await page.locator(".nickname-card .button.primary").click();
    await page.locator(".nickname-card").waitFor({ state: "hidden" });
  }
  await page.screenshot({ path: path.join(outputDir, "home.png"), fullPage: true });

  await page.goto("http://127.0.0.1:3000/review", { waitUntil: "networkidle" });
  const reviewImage = page.locator(".review-image-card img");
  const hasReview = await reviewImage.isVisible().catch(() => false);
  if (hasReview) {
    const loaded = await reviewImage.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth > 0);
    if (!loaded) throw new Error("Review image did not load.");
  } else if (!(await page.locator(".review-empty").isVisible())) {
    throw new Error("Review queue rendered neither an image nor an empty state.");
  }
  await page.screenshot({ path: path.join(outputDir, "review.png"), fullPage: true });

  await page.goto("http://127.0.0.1:3000/cat/demo-approved-orange", { waitUntil: "networkidle" });
  await page.locator(".locked-gallery").waitFor();

  await page.goto("http://127.0.0.1:3000/draw?cat=demo-approved-orange", { waitUntil: "networkidle" });
  const canvas = page.locator("canvas");
  await canvas.waitFor();
  await page.locator(".submit-drawing").click();
  await page.locator(".empty-canvas-warning").waitFor();
  await page.locator(".empty-canvas-warning .button").click();
  await page.locator(".empty-canvas-warning").waitFor({ state: "hidden" });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas was not visible.");
  await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.55);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.25, { steps: 12 });
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.58, { steps: 12 });
  await page.mouse.up();
  await page.screenshot({ path: path.join(outputDir, "draw.png"), fullPage: true });
  await page.locator(".submit-drawing").click();
  await page.waitForURL("**/cat/demo-approved-orange");
  await page.locator(".drawing-gallery").waitFor();
  if ((await page.locator(".mine-label").count()) !== 1) throw new Error("Own drawing did not unlock the gallery.");
  await page.waitForFunction(() => [...document.querySelectorAll(".drawing-gallery img")].every((image) => image instanceof HTMLImageElement && image.naturalWidth > 0));
  await page.screenshot({ path: path.join(outputDir, "gallery.png"), fullPage: true });

  console.log(JSON.stringify({ nickname: "ok", reviewState: "ok", galleryLock: "ok", emptyCanvasBlocked: "ok", canvasSubmit: "ok", galleryUnlock: "ok" }, null, 2));
} finally {
  await browser.close();
}
