<script lang="ts">
  import { XIcon } from "@lucide/svelte";
  import { basename } from "@zenfs/core/path";

  let {
    tabs = $bindable(),
    activeTab = $bindable(),
    onTabsChange = undefined,
    onActiveTabChange = undefined,
  }: {
    tabs: string[];
    activeTab: string | null;
    onTabsChange?: (tabs: string[]) => void;
    onActiveTabChange?: (tab: string | null) => void;
  } = $props();

  export function setActiveTab(tab: string) {
    if (tabs.includes(tab)) {
      activeTab = tab;
    }
  }

  export function addTab(tab: string) {
    if (!tabs.includes(tab)) {
      tabs = [...tabs, tab];
    }
  }

  export function closeTab(tab: string) {
    if (tabs.includes(tab)) {
      if (tab === activeTab) {
        if (tabs.length > 1) {
          const activeTabIndex = tabs.indexOf(tab);
          activeTab = tabs[activeTabIndex + 1] || tabs[activeTabIndex - 1];
        } else {
          activeTab = null;
        }
      }
      tabs = tabs.filter((val) => val !== tab);
    }
  }

  function onTabKeydown(e: KeyboardEvent, tab: string) {
    if (e.key === "Enter" || e.key === " ") {
      setActiveTab(tab);
    }
  }

  $effect(() => {
    if (onTabsChange) {
      onTabsChange(tabs);
    }
  });

  $effect(() => {
    if (onActiveTabChange) {
      onActiveTabChange(activeTab);
    }
  });
</script>

<div class="tabs">
  {#each tabs as tab (tab)}
    <div
      class="tab no-select"
      class:active={activeTab === tab}
      role="button"
      tabindex="0"
      onclick={() => setActiveTab(tab)}
      onkeydown={(e) => onTabKeydown(e, tab)}
    >
      <small>
        {basename(tab)}
      </small>
      {#if activeTab === tab}
        <button
          aria-label="Close tab"
          onclick={(e) => {
            e.stopPropagation();
            closeTab(tab);
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
  .no-select {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }

  .tabs {
    display: flex;
    width: 100%;
    height: 100%;
    overflow-x: auto;
  }

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
