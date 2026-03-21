import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
//@ts-ignore
import { buildXDC, mockWebxdc, eruda } from "@webxdc/vite-plugins";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "./dist-xdc",
  },
  plugins: [svelte(), mockWebxdc(), eruda(), buildXDC({ inDir: "dist-xdc" })],
});
