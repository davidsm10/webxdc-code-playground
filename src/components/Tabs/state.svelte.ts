import type { OpenTabs } from "./types";

export let openTabs: { tabs: OpenTabs } = $state({
  tabs: {},
});

export let activeTab: { id: string } = $state({
  id: "/index.html",
});
