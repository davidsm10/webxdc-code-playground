import type { OpenTabs } from "./types";

export let openTabs: { tabs: OpenTabs } = $state({
  tabs: {
    "/index.html": {
      name: "index.html",
    },
    "/index.js": {
      name: "index.js",
    },
    // Let's keep this out to save space on mobile.
    // This file is not really essential.
    // "/index.css": {
    //   name: "index.css",
    // },
    "/manifest.toml": {
      name: "manifest.toml",
    },
  },
});

export let activeTab: { id: string } = $state({
  id: "/index.html",
});
