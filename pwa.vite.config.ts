import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  root: "src",
  publicDir: "public-pwa",
  build: {
    outDir: "../dist-pwa",
    emptyOutDir: true,
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
      workbox: { maximumFileSizeToCacheInBytes: 999999999999 },
      pwaAssets: { image: "public-pwa/icon.svg" },
    }),
  ],
});
