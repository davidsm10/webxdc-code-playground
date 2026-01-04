<script lang="ts">
  import { openTabs, activeTab } from "./state.svelte";
  import type { OpenTabs } from "./types";
  import { XIcon } from "@lucide/svelte";
  import { generalDB } from "../../app";

  function onTabClick(tabId: string) {
    activeTab.id = tabId;
  }

  function onTabKeydown(e: KeyboardEvent, tabId: string) {
    if (e.key === "Enter" || e.key === " ") {
      activeTab.id = tabId;
    }
  }

  function onCloseTabClick(tabId: string) {
    const openTabsIds = Object.keys(openTabs.tabs);
    if (openTabsIds.length > 1) {
      const currentTabIndex = openTabsIds.indexOf(tabId);
      activeTab.id =
        openTabsIds[currentTabIndex + 1] || openTabsIds[currentTabIndex - 1];
    } else {
      activeTab.id = "FILES";
    }
    delete openTabs.tabs[tabId];
  }

  let setSavedTabsPromise = setSavedTabs();
  async function setSavedTabs() {
    const savedOpenTabs = await generalDB.getItem<OpenTabs>("tabs");
    const savedActiveTab = await generalDB.getItem<string>("activeTab");

    if (savedOpenTabs) {
      openTabs.tabs = savedOpenTabs;
    }

    if (savedActiveTab) {
      activeTab.id = savedActiveTab;
    }
  }

  $effect(() => {
    //Just to trigger this effect
    Object.keys(openTabs.tabs);
    setSavedTabsPromise.then(() => {
      generalDB.setItem("tabs", $state.snapshot(openTabs).tabs);
    });
  });

  $effect(() => {
    activeTab.id;
    setSavedTabsPromise.then(() => {
      generalDB.setItem("activeTab", $state.snapshot(activeTab).id);
    });
  });
</script>

<div class="tabs">
  {#await setSavedTabsPromise then}
    {#each Object.entries(openTabs.tabs) as [id, tab]}
      <div
        class={activeTab.id === id ? "tab active" : "tab"}
        role="button"
        tabindex="0"
        onclick={() => onTabClick(id)}
        onkeydown={(e) => onTabKeydown(e, id)}
      >
        <small>
          {tab.name}
        </small>
        {#if activeTab.id === id}
          <button
            aria-label="Close tab"
            onclick={(e) => {
              e.stopPropagation();
              onCloseTabClick(id);
            }}
            class="close-tab-btn"
          >
            <XIcon size="20" />
          </button>
        {/if}
      </div>
    {/each}
  {/await}
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
      border: none;
      border-top: 2px solid #61afef;
      padding-right: 0;
    }

    .tab:hover {
      background-color: #3a3f4b;
    }

    .tab:focus {
      outline: none;
      border: 0.5px solid #61afef;
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
    outline: 0.5px solid #61afef;
  }

  .close-tab-btn:active {
    color: #fff;
    background-color: #535a6d;
  }
</style>
