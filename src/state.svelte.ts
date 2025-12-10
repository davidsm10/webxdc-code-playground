import type { OpenTabs } from "./types";

export let openTabs: OpenTabs = $state({
  "/index.html": {
    name: "index.html",
  },
});

export let activeTab: { id: string } = $state({
  id: "/index.html",
});
