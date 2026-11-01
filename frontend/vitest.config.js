import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Test-only config (kept separate so vite.config.js / the dev server are untouched).
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, include: ["src/**/*.test.{js,jsx}"] },
});
