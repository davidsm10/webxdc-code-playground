<script lang="ts">
  import Tabs from "../Tabs/Tabs.svelte";
  import Editor from "../Editor/Editor.svelte";
  import Preview from "../Preview.svelte";
  import FileManager from "../FileManager/FileManager.svelte";
  import { openTabs, activeTab } from "../Tabs/state.svelte";
  import {
    EllipsisVerticalIcon,
    FilesIcon,
    PlayIcon,
    Share2Icon,
  } from "@lucide/svelte";
  import { wrap } from "comlink";
  import type { WorkerShape } from "@valtown/codemirror-ts/worker";
  import { setupZenFSDB, setupTemplate, exportWebxdc } from "./main";
  import { createFloatingActions } from "svelte-floating-ui";
  import { offset } from "svelte-floating-ui/dom";
  import { tick } from "svelte";

  const rawTypescriptWorker = new Worker(
    new URL("../../typescript/worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
  const typescriptWorker = wrap<WorkerShape>(rawTypescriptWorker);
  typescriptWorker.initialize();

  let showActions = $state(false);
  // svelte-ignore non_reactive_update
  let actionsDiv: HTMLDivElement;

  const [floatingRef, floatingContent] = createFloatingActions({
    strategy: "fixed",
    placement: "left-start",
    middleware: [offset({ crossAxis: 6, mainAxis: 6 })],
  });

  async function onShowActionsClick() {
    showActions = true;
    await tick();
    actionsDiv.focus();
  }

  function onActionsFocusOut() {
    setTimeout(() => {
      if (!actionsDiv.contains(document.activeElement)) {
        showActions = false;
      }
    }, 0);
  }
</script>

<div class="container">
  <div class="header">
    <button
      class={activeTab.id === "FILES" ? "tab active" : "tab"}
      onclick={() => (activeTab.id = "FILES")}
      title="Files"
    >
      <FilesIcon size="20" />
    </button>
    <Tabs />
    <div class="panel-right">
      <button
        class={activeTab.id === "PREVIEW" ? "tab active" : "tab"}
        onclick={() => (activeTab.id = "PREVIEW")}
        title="Preview"
      >
        <PlayIcon size="20" />
      </button>
      <button
        class="tab"
        title="More"
        use:floatingRef
        onclick={onShowActionsClick}
      >
        <EllipsisVerticalIcon size="20" />
      </button>
    </div>
  </div>

  {#if showActions}
    <div
      class="actions"
      role="menu"
      tabindex="-1"
      bind:this={actionsDiv}
      use:floatingContent
      onfocusout={onActionsFocusOut}
    >
      <button onclick={exportWebxdc}>
        <Share2Icon size="20px" />
        Share webxdc
      </button>
    </div>
  {/if}

  <div class="content">
    {#await setupZenFSDB() then}
      {#await setupTemplate() then}
        <div hidden={activeTab.id !== "FILES"} style="height: 100%;">
          <FileManager />
        </div>
        {#if activeTab.id === "PREVIEW"}
          <Preview entryPath="/index.html" />
        {/if}
        {#each Object.keys(openTabs.tabs) as path}
          <div hidden={path !== activeTab.id} style="height: 100%;">
            <Editor {path} {typescriptWorker} />
          </div>
        {/each}
      {/await}
    {/await}
  </div>
</div>

<style>
  .container {
    width: 100%;
    height: 100%;
  }

  .header {
    height: 40px;
    position: sticky;
    top: 0;
    z-index: 1000;
    display: flex;
    background-color: #21242b;
  }

  .content {
    height: calc(100% - 45px);
  }

  .panel-right {
    height: 100%;
    display: flex;
    border-left: 0.5px solid #3a3f4b;
  }

  .header .tab {
    padding: 10px;
  }

  .actions {
    position: fixed;
    z-index: 1000;
    width: max-content;
    min-width: 150px;
    border: 0.5px solid #3a3f4b;
    display: flex;
    flex-direction: column;
    background-color: #1c1f27;
  }

  .actions button {
    display: flex;
    gap: 3px;
    border: none;
    padding: 5px;
    cursor: pointer;
    color: #abb2bf;
    background-color: transparent;
    border-bottom: 0.1px solid #3a3f4b;
  }

  .actions button:hover {
    color: #fff;
    background-color: #454b5a;
  }

  .actions button:focus {
    color: #fff;
    outline-style: solid;
    outline-offset: -2px;
    outline-width: 0.5px;
    outline-color: #61afef;
  }

  .actions button:active {
    color: #fff;
    background-color: #576073;
  }
</style>
