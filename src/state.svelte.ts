import type { OpenTabs } from "./types";

export let openTabs: { tabs: OpenTabs } = $state({
  tabs: {
    "/index.html": {
      name: "index.html",
    },
  },
});

export let activeTab: { id: string } = $state({
  id: "/index.html",
});
