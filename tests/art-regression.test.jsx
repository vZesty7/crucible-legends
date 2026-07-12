/* ART PASS I — visual regression gate (permanent, deploy-gating).
   Renders the ?artgallery surface (all twelve portraits, all six poses per
   fighter, and the black-fill silhouette strips) and snapshots the exact SVG
   markup. Any change to the art fails this test until the snapshot is
   deliberately updated — the committed snapshot is the reference. */
import { test, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/react";
import App from "../src/App.jsx";

afterEach(() => cleanup());

test("the gallery markup matches the committed reference", () => {
  window.history.replaceState(null, "", "/?artgallery");
  const { container } = render(<App />);
  const svgs = container.querySelectorAll("svg");
  // 12 portraits + 72 poses + 16 forge + 12 trophies + 72 board-scale + 24 mirror + 24 projectile-forge + 4 rake-proof + 72 silhouettes = 308
  expect(svgs.length).toBe(308);
  expect(container.innerHTML).toMatchSnapshot();
  window.history.replaceState(null, "", "/");
});

test("reduced motion strips every animation from the board figures", async () => {
  // re-import the app with prefers-reduced-motion active (REDUCED is read at module load)
  vi.resetModules();
  const orig = window.matchMedia;
  window.matchMedia = (q) => ({
    matches: q.includes("prefers-reduced-motion"),
    media: q, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
  });
  try {
    const { default: AppReduced } = await import("../src/App.jsx?reduced");
    window.history.replaceState(null, "", "/?artgallery");
    const { container } = render(<AppReduced />);
    expect(container.querySelectorAll("svg").length).toBe(308);
    // no breathing wrapper, no sway, no particles, no pose-swap animation class
    expect(container.querySelector(".vfig")).toBeNull();
    expect(container.querySelector(".figSway")).toBeNull();
    expect(container.querySelector(".figIn")).toBeNull();
    expect(container.querySelector(".pDrift1, .pEmber1, .pMote1")).toBeNull();
  } finally {
    window.matchMedia = orig;
    window.history.replaceState(null, "", "/");
    vi.resetModules();
  }
});
