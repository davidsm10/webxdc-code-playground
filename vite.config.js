import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildXDC, mockWebxdc, eruda } from "@webxdc/vite-plugins";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "./dist-xdc",
  },
  plugins: [react(), mockWebxdc(), eruda(), buildXDC({ inDir: "dist-xdc" })],
});
