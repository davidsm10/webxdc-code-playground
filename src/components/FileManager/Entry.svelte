<script lang="ts">
  import {
    ChevronDown,
    ChevronRight,
    EllipsisVerticalIcon,
    FileIcon,
  } from "@lucide/svelte";
  import Entry from "./Entry.svelte";
  import Actions from "./Actions.svelte";
  import type { DirTree, Node } from "./types";
  import { getDirTree, sortNodes } from "./util";
  import tippy from "tippy.js";
  import { onMount } from "svelte";
  import { activeTab, openTabs } from "../../state.svelte";

  let {
    dirTree = $bindable(),
    node = $bindable(),
  }: {
    dirTree: DirTree;
    node: Node;
  } = $props();
  const depth = $derived(
    node.path === "/" ? 0 : node.path.split("/").length - 1
  );
  let children: DirTree = $state({});

  async function setChildren() {
    if (node.type === "dir") {
      children = await getDirTree(node.path);
    }
  }

  let open = $state(true);

  let showActions = $state(false);
  let actionsButton: HTMLButtonElement;
  let actionsDiv: HTMLDivElement;

  onMount(() => {
    tippy(actionsButton, {
      content: actionsDiv,
      placement: "left-start",
      trigger: "click",
      interactive: true,
      delay: [200, 0],
      onHidden: () => {
        showActions = false;
      },
    });
  });

  async function onClick() {
    if (node.type === "dir") {
      open = !open;
    } else {
      openTabs.tabs[node.path] = { name: node.name };
      activeTab.id = node.path;
    }
  }
</script>

<div class="entry">
  <button class="name" onclick={onClick} style="padding-left: {depth * 10}px;">
    {#if node.type === "file"}
      <FileIcon size="20" />
    {:else if open}
      <ChevronDown size="20" />
    {:else}
      <ChevronRight size="20" />
    {/if}
    {node.name}
  </button>
  <button onclick={() => (showActions = true)} bind:this={actionsButton}>
    <EllipsisVerticalIcon size="20" />
  </button>
</div>
{#if node.type === "dir"}
  <div hidden={!open} style="width: 100%;">
    {#await setChildren() then}
      {#each Object.values(children).sort(sortNodes) as { path }}
        <Entry bind:dirTree={children} bind:node={children[path]} />
      {/each}
    {/await}
  </div>
{/if}

<div hidden={!showActions} class="actions" bind:this={actionsDiv}>
  {#if showActions}
    <Actions bind:node bind:dirTree bind:children bind:showActions />
  {/if}
</div>

<style>
  button {
    display: flex;
    align-items: center;
    border: none;
    cursor: pointer;
    padding: 5px;
    gap: 3px;
    background: transparent;
    color: #abb2bf;
  }

  button:hover {
    background-color: #343943;
    color: #fff;
  }

  button:focus {
    outline: none;
    background-color: #3e4452;
    color: #fff;
  }

  button:active {
    background-color: #464e5f;
    color: #fff;
  }

  .entry {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 0.1px solid #3a3f4b;
  }

  .name {
    width: 100%;
    flex: 1;
  }
</style>
