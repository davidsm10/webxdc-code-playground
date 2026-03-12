import type { SvelteMap } from "svelte/reactivity";

export interface Tab {
  name: string;
}

export type Tabs = SvelteMap<string, Tab>;
export type TabsArray = [string, Tab][];
