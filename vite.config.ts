import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";
//@ts-ignore
import { buildXDC, mockWebxdc, eruda } from "@webxdc/vite-plugins";

// https://vite.dev/config/
export default defineConfig({
  build: {
    outDir: "./dist-xdc",
  },
  plugins: [
    svelte(),
    mockWebxdc(),
    eruda(),
    VitePWA({
      srcDir: "src",
      filename: "sw-webxdc.ts",
      injectRegister: "inline",
      strategies: "injectManifest",
      manifest: false,
      injectManifest: {
        injectionPoint: undefined,
      },
      devOptions: { enabled: true, type: "module" },
    }),
    buildXDC({ inDir: "dist-xdc" }),
  ],
});
