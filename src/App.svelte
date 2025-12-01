<script lang="ts">
  import Editor from "./components/Editor.svelte";
  import IconPicker from "./components/IconPicker.svelte";
  import Preview from "./components/Preview.svelte";
  import type { Icon } from "./types";
  import { PlayIcon, Share2Icon } from "@lucide/svelte";
  import localforage from "localforage";
  import JSZip from "jszip";

  const filesNames = ["index.html", "index.css", "index.js", "manifest.toml"];

  const filesContents: string[] = $state([]);

  let activeTab = $state("index.html");

  async function setSavedContent(name: string, index: number) {
    filesContents[index] =
      (await localforage.getItem<string>(name)) ||
      (await (await fetch("/template/" + name)).text());
  }

  async function exportWebxdc() {
    const zip = new JSZip();
    for (const name of filesNames) {
      zip.file(name, filesContents[filesNames.indexOf(name)]);
    }
    const icon = await localforage.getItem<Icon>("icon");
    if (icon) {
      zip.file("icon" + icon.ext, icon.blob);
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
        class={activeTab === "PREVIEW" ? "tab active" : "tab"}
        onclick={() => (activeTab = "PREVIEW")}
        title="Preview"
      >
        <PlayIcon size="20" />
      </button>
      {#each [...filesNames, "icon"] as name}
        <button
          class={activeTab === name ? "tab active" : "tab"}
          onclick={() => (activeTab = name)}>{name}</button
        >
      {/each}
    </div>
    <div class="actions">
      <button class="action-btn" onclick={exportWebxdc}>
        <Share2Icon size="15" />
      </button>
    </div>
  </div>

  <div class="content">
    {#if activeTab === "PREVIEW"}
      <Preview {filesContents} />
    {/if}
    {#each filesNames as name, index}
      {#await setSavedContent(name, index) then}
        <Editor
          bind:value={filesContents[index]}
          {name}
          hidden={name !== activeTab}
        />
      {/await}
    {/each}
    {#if activeTab === "icon"}
      <IconPicker />
    {/if}
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
