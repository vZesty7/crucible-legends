import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/crucible-legends/",
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    testTimeout: 120000,
    css: false,
  },
});
