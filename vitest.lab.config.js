import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Separate config for the long-running balance/audit lab.
// Run with: npx vitest run --config vitest.lab.config.js [file]
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    include: ["tests/lab/**/*.lab.jsx"],
    testTimeout: 3600000,
    hookTimeout: 3600000,
    css: false,
    silent: false,
  },
});
