import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "admin",
  plugins: [react()],
  base: "/admin-assets/",
  build: { outDir: "dist", emptyOutDir: true }
});
