<script lang="ts">
  import Editor from "./components/Editor.svelte";
  import Preview from "./components/Preview.svelte";
  import FileManager from "./components/FileManager/FileManager.svelte";
  import { openTabs, activeTab } from "./state.svelte";
  import { FilesIcon, PlayIcon, Share2Icon } from "@lucide/svelte";
  import JSZip from "jszip";
  import { configureSingle } from "@zenfs/core";
  import { resolve } from "@zenfs/core/path";
  import { IndexedDB } from "@zenfs/dom";
  import { readdir, readFile, writeFile } from "@zenfs/core/promises";
  import { wrap } from "comlink";
  import type { WorkerShape } from "@valtown/codemirror-ts/worker";

  const rawTypescriptWorker = new Worker(
    new URL("./typescript/worker.ts", import.meta.url),
    {
      type: "module",
    }
  );
  const typescriptWorker = wrap<WorkerShape>(rawTypescriptWorker);
  typescriptWorker.initialize();

  async function setupTemplate() {
    if (!(await readdir("/")).length) {
      const list: string[] = await (await fetch("/template.json")).json();
      for (const path of list) {
        const content = await (await fetch("/template" + path)).text();
        await writeFile(path, content);
      }
    }
  }

  async function exportWebxdc() {
    const zip = new JSZip();
    const files = await readdir("/", { withFileTypes: true, recursive: true });
    for (const file of files) {
      if (file.isDirectory()) continue;
      const path = resolve(file.parentPath, file.name);
      const content = await readFile(path);
      zip.file(path.replace("/", ""), content);
    }
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
    });
    window.webxdc.sendToChat({
      file: {
        name: "app.xdc",
        blob: zipBlob,
      },
    });
  }
</script>

<div class="container">
  <div class="header">
    <div class="tabs">
      <button
        class={activeTab.id === "FILES" ? "tab active" : "tab"}
        onclick={() => (activeTab.id = "FILES")}
        title="Files"
      >
        <FilesIcon size="20" />
      </button>
      <button
        class={activeTab.id === "PREVIEW" ? "tab active" : "tab"}
        onclick={() => (activeTab.id = "PREVIEW")}
        title="Preview"
      >
        <PlayIcon size="20" />
      </button>
      {#each Object.entries(openTabs) as [path, tab]}
        <button
          class={activeTab.id === path ? "tab active" : "tab"}
          onclick={() => (activeTab.id = path)}>{tab.name}</button
        >
      {/each}
    </div>
    <div class="actions">
      <button class="action-btn" onclick={exportWebxdc} title="Share">
        <Share2Icon size="15" />
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
        {#each Object.keys(openTabs) as path}
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
    gap: 3px;
    align-items: center;
    background-color: #21242b;
    justify-content: space-between;
  }

  .content {
    height: calc(100% - 45px);
  }

  .tabs {
    height: 100%;
    display: flex;
    overflow-x: auto;
  }

  .actions {
    height: 100%;
    display: flex;
    margin-right: 5px;
    align-items: center;
  }

  .tab {
    background-color: #21252b;
    color: #7d8799;
    border: none;
    padding: 15px 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    border-right: 0.5px solid #3a3f4b;
    flex: 0 0 auto;
  }

  .tab.active {
    background-color: #282c34;
    color: #abb2bf;
    border-top: 2px solid #61afef;
  }

  .tab:hover {
    background-color: #3a3f4b;
  }

  .action-btn {
    background: transparent;
    border: none;
    border-radius: 3px;
    color: #7d8799;
    font-size: 14px;
    padding: 5px;
    cursor: pointer;
    display: flex;
    align-items: center;
  }

  .action-btn:hover {
    background-color: #2c313c;
    color: #abb2bf;
  }

  .action-btn:active {
    background-color: #3a3f4b;
  }
</style>
