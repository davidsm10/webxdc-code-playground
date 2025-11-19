<script lang="ts">
  import Editor from "./components/Editor.svelte";
  import IconPicker from "./components/IconPicker.svelte";
  import Preview from "./components/Preview.svelte";
  import type { Icon } from "./types";
  import { PlayIcon, Share2Icon } from "@lucide/svelte";
  import localforage from "localforage";
  import JSZip from "jszip";

  const filesNames = ["index.html", "index.css", "index.js", "manifest.toml"];

  const filesContents: string[] = [];

  let activeTab = $state("index.html");
  let showPreview = $state(false);

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
  <div class="main" hidden={showPreview}>
    <div class="header">
      <div class="tabs">
        {#each [...filesNames, "icon"] as name}
          <button
            class={activeTab === name ? "tab active" : "tab"}
            onclick={() => (activeTab = name)}>{name}</button
          >
        {/each}
      </div>
      <div class="actions">
        <button class="action-btn" onclick={() => (showPreview = true)}>
          <PlayIcon size="15" />
        </button>
        <button class="action-btn" onclick={exportWebxdc}>
          <Share2Icon size="15" />
        </button>
      </div>
    </div>

    <div class="content">
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

  {#if showPreview}
    <Preview {filesContents} bind:showPreview />
  {/if}
</div>

<style>
  .container, .main {
    height: 100%;
  }
</style>
