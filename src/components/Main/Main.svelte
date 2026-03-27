<script lang="ts">
  import Tabs from "../Tabs/Tabs.svelte";
  import Editor from "../Editor/Editor.svelte";
  import FileManager from "../FileManager/FileManager.svelte";
  import {
    ArrowLeftIcon,
    CodeXmlIcon,
    EllipsisVerticalIcon,
    FilesIcon,
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
  import type { Template } from "./types";
  import type { Node } from "../FileManager/types";
  import type { TabsArray } from "../Tabs/types";
  import { relative, isAbsolute } from "@zenfs/core/path";

  // svelte-ignore non_reactive_update
  let tabsComp: Tabs;
  let tabs: TabsArray = $state.raw([]);
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
      const template: Template = await (await fetch("template.json")).json();
      for (const path of template.files) {
        const content = await (await fetch("template" + path)).text();
        await writeFile(path, content);
      }

      tabs = template.tabs;
      activeTab = "/index.html";
      await generalDB.setItem("templateSet", true);
    }
  }

  function onFSNodeDeleted(node: Node) {
    tabs.forEach(([path]) => {
      if (path === node.path) tabsComp.closeTab(path);
      const relativePath = relative(node.path, path);
      if (
        relativePath &&
        !relativePath.startsWith("..") &&
        !isAbsolute(relativePath)
      ) {
        tabsComp.closeTab(path);
      }
    });
  }

  function onFSFileNodeClick(node: Node) {
    tabsComp.addTab(node.path, { name: node.name });
    activeTab = node.path;
  }

  async function onActiveTabChange(tabId: string | null) {
    await generalDB.setItem("activeTab", tabId);
  }

  async function onTabsChange(tabs: TabsArray) {
    await generalDB.setItem("tabs", tabs);
  }

  async function setSavedTabs() {
    const savedTabs = await generalDB.getItem<TabsArray>("tabs");
    const savedActiveTab = await generalDB.getItem<string>("activeTab");
    if (savedTabs) tabs = savedTabs;
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
</script>

<div class="container">
  {#await setupZenFSDB() then}
    {#await setupTemplate() then}
      <div class="side-bar" hidden={!showFileManager}>
        <FileManager
          onDeleted={onFSNodeDeleted}
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
              bind:tabs
              bind:activeTab
              bind:this={tabsComp}
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
            {#if activeTab !== null}
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
          </div>
        {/if}

        <div class="content">
          {#each tabs as [path] (path)}
            <div hidden={path !== activeTab} style="height: 100%;">
              {#await readFile(path, { encoding: "utf-8" }) then initialValue}
                <Editor
                  {path}
                  {initialValue}
                  {typescriptWorker}
                  onChange={(value) => onEditorValueChanged(path, value)}
                  onDestroy={() => delete editors[path]}
                  bind:this={editors[path]}
                />
              {/await}
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
