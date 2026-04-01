import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  publicDir: "public-pwa",
  build: {
    outDir: "./dist-pwa",
  },
  plugins: [
    svelte(),
    VitePWA({
      manifest: {
        name: "Code Playground",
        short_name: "Playground",
        background_color: "#282c34",
        theme_color: "#282c34",
      },
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: "inline",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 999999999999,
      },
      devOptions: { enabled: true, type: "module" },
      pwaAssets: { image: "public-pwa/icon.svg" },
    }),
  ],
});
