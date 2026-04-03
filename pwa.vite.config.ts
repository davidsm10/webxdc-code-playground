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
        icons: [
          {
            src: "pwa-64x64.png",
            sizes: "64x64",
            type: "image/png",
          },
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      injectRegister: "inline",
      injectManifest: {
        maximumFileSizeToCacheInBytes: 999999999999,
      },
      devOptions: { enabled: true, type: "module" },
    }),
  ],
});
