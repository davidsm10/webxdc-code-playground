<script lang="ts">
  import Tabs from "../Tabs/Tabs.svelte";
  import Editor from "../Editor/Editor.svelte";
  import FileManager from "../FileManager/FileManager.svelte";
  import Preview from "../Preview/Preview.svelte";
  import {
    ArrowLeftIcon,
    CodeXmlIcon,
    EllipsisVerticalIcon,
    FilesIcon,
    PlayIcon,
    Share2Icon,
  } from "@lucide/svelte";
  import { wrap } from "comlink";
  import type { WorkerShape } from "@valtown/codemirror-ts/worker";
  import { generalDB, setupZenFSDB } from "../../dbs";
  import { createFloatingActions } from "svelte-floating-ui";
  import { offset } from "svelte-floating-ui/dom";
  import { tick } from "svelte";
  import { getFolderZip } from "../FileManager/file-manager";
  import { exportFile } from "../../util";
  import { readFile, writeFile } from "@zenfs/core/promises";
  import * as webTemplate from "../../web-template";
  import * as webxdcTemplate from "../../webxdc-template";
  import type { Node } from "../FileManager/types";
  import { relative, isAbsolute, resolve } from "@zenfs/core/path";
  import type { FileRequest, FileResponse } from "../Preview/types";

  // svelte-ignore non_reactive_update
  let tabs: Tabs;
  let tabsArray: string[] = $state.raw([]);
  let activeTab: string | null = $state(null);

  let editors: { [path: string]: Editor } = {};

  const rawTypescriptWorker = new Worker(
    new URL("../../typescript/worker.ts", import.meta.url),
    {
      type: "module",
    },
  );
  const typescriptWorker = wrap<WorkerShape>(rawTypescriptWorker);
  typescriptWorker.initialize();

  navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);
  async function onServiceWorkerMessage(event: MessageEvent<FileRequest>) {
    if (event.data.type !== "file-request") return;
    let response: FileResponse = {
      type: "file-response",
      path: event.data.path,
    };
    try {
      if (event.data.path.endsWith(".html") && window.webxdc) {
        const textContent = await readFile(event.data.path, {
          encoding: "utf-8",
        });
        const doc = new DOMParser().parseFromString(textContent, "text/html");
        const scripts = doc.querySelectorAll("script");
        scripts.forEach((script) => {
          if (script.src && new URL(script.src).pathname === "/webxdc.js") {
            script.removeAttribute("src");
            script.textContent = "window.webxdc = window.parent.webxdc";
          }
        });
        response.content = "<!doctype html>\n" + doc.documentElement.outerHTML;
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
    activeTab = node.path;
  }

  async function onActiveTabChange(tab: string | null) {
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

  async function onEditorValueChanged(path: string, value: string) {
    await writeFile(path, value);
  }

  function formatActiveTabContent() {
    if (activeTab) {
      editors[activeTab].formatEditorContent();
    }
    showActions = false;
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
            {#if activeTab !== null && !activeTab.startsWith("preview:")}
              <button
                class="button"
                title="More"
                use:floatingRef
                onclick={onShowActionsClick}
              >
                <EllipsisVerticalIcon size="20" />
              </button>
            {/if}
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
            <button onclick={formatActiveTabContent}>
              <CodeXmlIcon size="20" />
              Format file
            </button>
            {#await navigator.serviceWorker.ready then}
              <button onclick={openPreview}>
                <PlayIcon size="20" />
                Open preview
              </button>
            {/await}
          </div>
        {/if}

        <div class="content">
          {#each tabsArray as tab (tab)}
            <div hidden={tab !== activeTab} style="height: 100%;">
              {#if tab.startsWith("preview:")}
                {#if activeTab === tab}
                  <Preview entryPath={tab.replace("preview:", "")} />
                {/if}
              {:else}
                {#await readFile(tab, { encoding: "utf-8" }) then initialValue}
                  <Editor
                    path={tab}
                    {initialValue}
                    {typescriptWorker}
                    onChange={(value) => onEditorValueChanged(tab, value)}
                    onDestroy={() => delete editors[tab]}
                    bind:this={editors[tab]}
                  />
                {/await}
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
    align-items: center;
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
