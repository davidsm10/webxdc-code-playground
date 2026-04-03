import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

export default defineConfig({
  images: ["public-pwa/icon.svg"],
  preset: minimal2023Preset,
  headLinkOptions: { preset: "2023" },
});
