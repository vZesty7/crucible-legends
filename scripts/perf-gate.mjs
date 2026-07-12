/* THE PERFORMANCE GATE (permanent; run against a local dev server before
   every deploy). Two assertions, BOTH must pass:
   1. ABSOLUTE FLOOR (v0.91): >= 60fps (16.7ms budget) during the conducted
      round theater on the mid-range phone profile (390x844 @2x, 4x CPU
      throttle).
   2. CEILING-RELATIVE (v0.88): >= 90% of the measurement harness's own
      blank-page frame ceiling in the same session, so host-machine load
      cannot mask a real regression (or fake one).
   Per the standing rule of 2026-07-12, this gate's definition may not be
   changed without a designer-approved dated design-doc entry FIRST. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.CL_URL || "http://localhost:5173/crucible-legends/";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
const cdp = await page.createCDPSession();
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

const measureFps = async (seconds = 2.5) =>
  page.evaluate(
    (secs) =>
      new Promise((resolve) => {
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < secs * 1000) requestAnimationFrame(tick);
          else resolve(frames / secs);
        };
        requestAnimationFrame(tick);
      }),
    seconds
  );

await page.goto("about:blank");
const ceiling = await measureFps(2);

await page.goto(URL, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 500));
const fire = async (text) =>
  page.evaluate((t) => {
    const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes(t));
    if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return !!b;
  }, text);
await fire("GHARZUL");
await new Promise((r) => setTimeout(r, 250));
for (const a of ["Bloodhowl", "Skullsplitter", "Bone Grinder", "Iron Hide"]) {
  await fire(a);
  await new Promise((r) => setTimeout(r, 80));
}
await fire("Warmonger");
await new Promise((r) => setTimeout(r, 80));
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find(
    (x) => x.querySelector("svg") && x.innerHTML.includes("bgV") && x.textContent.length < 40
  );
  if (b) b.dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 80));
await fire("Enter the Crucible");
await new Promise((r) => setTimeout(r, 600));
for (let i = 0; i < 8; i++) {
  const still = await page.evaluate(() => document.body.innerText.includes("TAP TO BEGIN"));
  if (!still) break;
  await page.mouse.click(195, 420);
  await new Promise((r) => setTimeout(r, 500));
}
await fire("Stay in");
await new Promise((r) => setTimeout(r, 120));
await fire("Skullsplitter");
await new Promise((r) => setTimeout(r, 120));
await page.evaluate(() => {
  const t = [...document.querySelectorAll("button")].filter((b) => b.className.includes("h-32"));
  if (t[1]) t[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 120));
await fire("Lock in");
await new Promise((r) => setTimeout(r, 400));
const theater = await measureFps(2.5);

const ratio = theater / ceiling;
console.log(JSON.stringify({ ceilingFps: +ceiling.toFixed(1), theaterFps: +theater.toFixed(1), ratio: +ratio.toFixed(3) }));
await browser.close();

let fail = false;
if (theater < 60) { console.error(`FLOOR FAILED: ${theater.toFixed(1)}fps < 60fps absolute floor`); fail = true; }
if (ratio < 0.9) { console.error(`CEILING-RELATIVE FAILED: ${(ratio * 100).toFixed(1)}% < 90% of harness ceiling`); fail = true; }
if (fail) process.exit(1);
console.log("PERF GATE PASSED (floor + ceiling-relative)");
