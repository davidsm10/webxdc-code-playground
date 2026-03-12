<script lang="ts">
  import { XIcon } from "@lucide/svelte";
  import type { Tabs, Tab, TabsArray } from "./types";
  import { SvelteMap } from "svelte/reactivity";

  let {
    tabs: tabsArray = $bindable(),
    activeTab = $bindable(),
    onTabsChange = undefined,
    onActiveTabChange = undefined,
  }: {
    tabs: TabsArray;
    activeTab: string | null;
    onTabsChange?: (tabs: TabsArray) => void;
    onActiveTabChange?: (tabId: string | null) => void;
  } = $props();

  const tabs: Tabs = new SvelteMap(tabsArray);

  export function setActiveTab(tabId: string) {
    if (tabs.has(tabId)) {
      activeTab = tabId;
    }
  }

  export function addTab(tabId: string, tab: Tab) {
    tabs.set(tabId, tab);
  }

  export function closeTab(tabId: string) {
    if (tabs.has(tabId)) {
      tabs.delete(tabId);
    }
  }

  function onCloseTabBtnClick(tabId: string) {
    if (tabs.size > 1) {
      const tabsId = Array.from(tabs.keys());
      const activeTabIndex = tabsId.indexOf(tabId);
      activeTab = tabsId[activeTabIndex + 1] || tabsId[activeTabIndex - 1];
    } else {
      activeTab = "FILES";
    }
    closeTab(tabId);
  }

  function onTabKeydown(e: KeyboardEvent, tabId: string) {
    if (e.key === "Enter" || e.key === " ") {
      setActiveTab(tabId);
    }
  }

  $effect(() => {
    if (onTabsChange) {
      const newTabsArray = Array.from(tabs);
      onTabsChange(newTabsArray);
      tabsArray = newTabsArray;
    }
  });

  $effect(() => {
    if (onActiveTabChange) {
      onActiveTabChange(activeTab);
    }
  });
</script>

<div class="tabs">
  {#each tabsArray as [id, tab] (id)}
    <div
      class={activeTab === id ? "tab active" : "tab"}
      role="button"
      tabindex="0"
      onclick={() => setActiveTab(id)}
      onkeydown={(e) => onTabKeydown(e, id)}
    >
      <small>
        {tab.name}
      </small>
      {#if activeTab === id}
        <button
          aria-label="Close tab"
          onclick={(e) => {
            e.stopPropagation();
            onCloseTabBtnClick(id);
          }}
          class="close-tab-btn"
        >
          <XIcon size="20" />
        </button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .tabs {
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: auto;
  }

  :global {
    .tab {
      color: #7d8799;
      background-color: #21252b;
      border: none;
      padding: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      border-right: 0.5px solid #3a3f4b;
      flex: 0 0 auto;
    }

    .tab.active,
    .tab.active:focus {
      background-color: #282c34;
      color: #abb2bf;
      outline-style: none;
      border-top: 2px solid #61afef;
      padding-right: 0;
    }

    .tab:hover {
      background-color: #3a3f4b;
    }

    .tab:focus {
      outline-style: solid;
      outline-offset: -2px;
      outline-width: 0.5px;
      outline-color: #61afef;
    }
  }

  .close-tab-btn {
    color: #7d8799;
    background-color: #2e323c;
    margin: 5px;
    border: none;
    border-radius: 3px;
    padding: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }

  .close-tab-btn:hover {
    color: #fff;
    background-color: #464c5c;
  }

  .close-tab-btn:focus {
    outline-style: solid;
    outline-width: 0.5px;
    outline-color: #61afef;
  }

  .close-tab-btn:active {
    color: #fff;
    background-color: #535a6d;
  }
</style>
