import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";

const candidates = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"];
const executablePath = candidates.find(existsSync);
if (!executablePath) throw new Error("Chrome or Edge was not found.");
const adminKey = process.env.ADMIN_ACCESS_KEY || readFileSync(path.resolve(process.cwd(), ".env.local"), "utf8").match(/^ADMIN_ACCESS_KEY=(.+)$/m)?.[1];
if (!adminKey) throw new Error("ADMIN_ACCESS_KEY was not found.");
const outputDir = path.resolve(process.cwd(), "../../work/browser-qa");
mkdirSync(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });

try {
  const admin = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await admin.goto("http://127.0.0.1:3000/internal-console", { waitUntil: "networkidle" });
  await admin.locator(".admin-login-card").waitFor();
  if (await admin.locator(".site-header, .site-footer").count()) throw new Error("Public navigation leaked into the internal console.");
  await admin.locator("#admin-key").fill("wrong-key");
  await admin.locator(".admin-login-card .button").click();
  await admin.locator(".admin-login-card .form-error").waitFor();
  await admin.locator("#admin-key").fill(adminKey);
  await admin.locator(".admin-login-card .button").click();
  await admin.locator(".admin-shell").waitFor();
  await admin.locator(".admin-content-card").first().waitFor();
  await admin.screenshot({ path: path.join(outputDir, "internal-console.png"), fullPage: true });

  const gallery = await browser.newContext({ viewport: { width: 1200, height: 900 } });
  await gallery.addCookies([{ name: "ugly_cat_user", value: "demo-uploader", url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
  const galleryPage = await gallery.newPage();
  await galleryPage.goto("http://127.0.0.1:3000/cat/demo-approved-orange", { waitUntil: "networkidle" });
  const reportButton = galleryPage.locator(".drawing-report-button").first();
  await reportButton.waitFor();
  await reportButton.click();
  await galleryPage.locator(".report-card").waitFor();
  await galleryPage.screenshot({ path: path.join(outputDir, "drawing-report.png"), fullPage: true });
  await gallery.close();

  console.log(JSON.stringify({ directAdminGate: "ok", wrongKeyRejected: "ok", adminLogin: "ok", dashboardRendered: "ok", publicNavHidden: "ok", drawingReportDialog: "ok" }, null, 2));
} finally {
  await browser.close();
}
