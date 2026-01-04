<script lang="ts">
  import Tabs from "./components/Tabs/Tabs.svelte";
  import Editor from "./components/Editor.svelte";
  import Preview from "./components/Preview.svelte";
  import FileManager from "./components/FileManager/FileManager.svelte";
  import { openTabs, activeTab } from "./components/Tabs/state.svelte";
  import { FilesIcon, PlayIcon, Share2Icon } from "@lucide/svelte";
  import { configureSingle } from "@zenfs/core";
  import { IndexedDB } from "@zenfs/dom";
  import { wrap } from "comlink";
  import type { WorkerShape } from "@valtown/codemirror-ts/worker";
  import { setupTemplate, exportWebxdc } from "./app";

  const rawTypescriptWorker = new Worker(
    new URL("./typescript/worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
  const typescriptWorker = wrap<WorkerShape>(rawTypescriptWorker);
  typescriptWorker.initialize();
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
      <button class="tab" onclick={exportWebxdc} title="Share">
        <Share2Icon size="20" />
      </button>
    </div>
  </div>

  <div class="content">
    {#await configureSingle({ backend: IndexedDB }) then}
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
</style>
