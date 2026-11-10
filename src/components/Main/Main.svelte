<script lang="ts">
  import Tabs from "../Tabs/Tabs.svelte";
  import Editor from "../Editor/Editor.svelte";
  import FileManager from "../FileManager/FileManager.svelte";
  import Preview from "../Preview/Preview.svelte";
  import {
    ArrowLeftIcon,
    FilesIcon,
    PlayIcon,
    Share2Icon,
  } from "@lucide/svelte";
  import { generalDB, setupZenFSDB } from "../../dbs";
  import { tick } from "svelte";
  import { getFolderZip } from "../FileManager/file-manager";
  import { exportFile } from "../../util";
  import { readFile, writeFile } from "@zenfs/core/promises";
  import * as webTemplate from "../../web-template";
  import * as webxdcTemplate from "../../webxdc-template";
  import type { Node } from "../FileManager/types";
  import { relative, isAbsolute, resolve } from "@zenfs/core/path";
  import type { FileRequest, FileResponse } from "../Preview/types";
  import eruda from "eruda?raw";

  // svelte-ignore non_reactive_update
  let tabs: Tabs;
  let tabsArray: string[] = $state.raw([]);
  let activeTab: string | null = $state(null);

  let editors: { [path: string]: Editor } = {};

  persistStorage();
  async function persistStorage() {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        if (persisted) {
          console.log("Storage persisted");
        } else {
          console.log("Storage no persisted");
        }
      } catch (err) {
        console.log("Error persisting storage:", err);
      }
    } else {
      console.log("Persistent storage not available");
    }
  }

  navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
  async function onServiceWorkerMessage(event: MessageEvent<FileRequest>) {
    if (event.data.type !== "file-request") return;
    let response: FileResponse = {
      type: "file-response",
      path: event.data.path,
    };
    try {
      if (event.data.path.endsWith(".html")) {
        const textContent = await readFile(event.data.path, {
          encoding: "utf-8",
        });
        const doc = new DOMParser().parseFromString(textContent, "text/html");
        const erudaScript = doc.createElement("script");
        erudaScript.src = "/___injected_eruda.js";
        doc.head.prepend(erudaScript);
        if (window.webxdc) {
          const scripts = doc.querySelectorAll("script");
          scripts.forEach((script) => {
            if (script.src && new URL(script.src).pathname === "/webxdc.js") {
              script.removeAttribute("src");
              script.textContent = "window.webxdc = window.parent.webxdc";
            }
          });
        }
        response.content = "<!doctype html>\n" + doc.documentElement.outerHTML;
      } else if (event.data.path === "/___injected_eruda.js") {
        response.content = eruda + "\neruda.init()";
      } else {
        response.content = (await readFile(
          event.data.path,
        )) as Uint8Array<ArrayBuffer>;
      }
    } catch (err) {
      response.error = err;
    } finally {
      event.source?.postMessage(response);
    }
  }

  let showFileManager = $state(false);

  async function exportApp() {
    const appZip = await getFolderZip("/");
    await exportFile(appZip, "app.xdc");
  }

  async function setupTemplate() {
    if (!(await generalDB.getItem("templateSet"))) {
      const template = window.webxdc ? webxdcTemplate : webTemplate;
      for (const [path, content] of template.files) {
        await writeFile(path, content);
      }

      tabsArray = template.tabs;
      activeTab = "/index.html";
      await generalDB.setItem("templateSet", true);
    }
  }

  function onFSNodeDeleted(node: Node) {
    tabsArray.forEach((tab) => {
      if (tab === node.path) tabs.closeTab(tab);
      else {
        const relativePath = relative(node.path, tab);
        if (
          relativePath &&
          !relativePath.startsWith("..") &&
          !isAbsolute(relativePath)
        ) {
          tabs.closeTab(tab);
        }
      }
    });
  }

  function onFSNodeRenamed(from: Node, to: Node) {
    tabsArray.forEach((tab) => {
      if (tab === from.path) tabs.replaceTab(from.path, to.path);
      else {
        const relativePath = relative(from.path, tab);
        if (
          relativePath &&
          !relativePath.startsWith("..") &&
          !isAbsolute(relativePath)
        ) {
          const finalPath = resolve(to.path, relativePath);
          tabs.replaceTab(tab, finalPath);
        }
      }
    });
  }

  function onFSFileNodeClick(node: Node) {
    tabs.addTab(node.path);
    tabs.setActiveTab(node.path);
  }

  async function onActiveTabChange(tab: string | null) {
    if (tab && !tab.startsWith("preview:")) {
      await tick();
      if (editors[tab]) editors[tab].focus();
    }
    await generalDB.setItem("activeTab", tab);
  }

  async function onTabsChange(tabs: string[]) {
    await generalDB.setItem("tabs", tabs);
  }

  async function setSavedTabs() {
    const savedTabs = await generalDB.getItem<string[]>("tabs");
    const savedActiveTab = await generalDB.getItem<string>("activeTab");
    if (savedTabs) tabsArray = savedTabs;
    if (savedActiveTab) activeTab = savedActiveTab;
  }

  function openPreview() {
    let previewTab;
    if (activeTab?.endsWith(".html")) {
      previewTab = "preview:" + activeTab;
    } else {
      previewTab = "preview:" + "/index.html";
    }
    tabs.addTab(previewTab);
    tabs.setActiveTab(previewTab);
  }
</script>

<div class="container">
  {#await setupZenFSDB() then}
    {#await setupTemplate() then}
      <div class="side-bar" hidden={!showFileManager}>
        <FileManager
          onDeleted={onFSNodeDeleted}
          onRenamed={onFSNodeRenamed}
          onFileNodeClick={onFSFileNodeClick}
        />
      </div>
      <div class="main">
        <div class="header">
          <div class="panel-left">
            <button
              class="button"
              onclick={() => (showFileManager = !showFileManager)}
              title="Files"
            >
              {#if showFileManager}
                <ArrowLeftIcon />
              {:else}
                <FilesIcon size="20" />
              {/if}
            </button>
          </div>
          {#await setSavedTabs() then}
            <Tabs
              bind:tabs={tabsArray}
              bind:activeTab
              bind:this={tabs}
              {onActiveTabChange}
              {onTabsChange}
            />
          {/await}
          <div class="panel-right">
            {#await navigator.serviceWorker.ready then}
              {#if !activeTab?.startsWith("preview:")}
                <button
                  class="button"
                  aria-label="Open preview"
                  title="Open preview"
                  onclick={openPreview}
                >
                  <PlayIcon size="20" />
                </button>
              {/if}
            {/await}
            {#if window.webxdc}
              <button
                class="button"
                onclick={exportApp}
                aria-label="Export app"
                title="Export app"
              >
                <Share2Icon size="20px" />
              </button>
            {/if}
          </div>
        </div>

        <div class="content">
          {#each tabsArray as tab (tab)}
            <div hidden={tab !== activeTab} style="height: 100%;">
              {#if tab.startsWith("preview:")}
                {#if activeTab === tab}
                  <Preview entryPath={tab.replace("preview:", "")} />
                {/if}
              {:else}
                <Editor
                  path={tab}
                  onDestroy={() => delete editors[tab]}
                  bind:this={editors[tab]}
                />
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/await}
  {/await}
</div>

<style>
  .container {
    width: 100%;
    height: 100%;
    display: flex;
  }

  .side-bar {
    flex: 0 0 auto;
    width: 300px;
    max-width: 75%;
    border-right: 0.5px solid #3a3f4b;
  }

  .main {
    flex: 1 1 auto;
    min-width: 0;
    overflow-x: hidden;
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

  .panel-right,
  .panel-left {
    height: 100%;
    display: flex;
    gap: 3px;
    align-items: center;
    padding-left: 5px;
    padding-right: 5px;
  }

  .header .button {
    height: 80%;
    border: none;
    border-radius: 5px;
    background-color: transparent;
    color: #abb2bf;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .header .button:hover,
  .header .button:focus {
    background-color: #3a3f4b;
    outline-style: none;
  }

  .header .button:active {
    background-color: #535a6d;
  }
</style>
