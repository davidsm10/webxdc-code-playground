<script lang="ts">
  import {
    ChevronDown,
    ChevronRight,
    EllipsisVerticalIcon,
    FileIcon,
  } from "@lucide/svelte";
  import Entry from "./Entry.svelte";
  import Actions from "./Actions.svelte";
  import type { Events, Node } from "./types";
  import { getDirectoryNodes, sortNodes } from "./file-manager";
  import { offset, flip, shift } from "svelte-floating-ui/dom";
  import { createFloatingActions } from "svelte-floating-ui";
  import { tick } from "svelte";

  let {
    node,
    reloadParentFolder,
    events,
  }: {
    node: Node;
    reloadParentFolder: () => void;
    events: Events;
  } = $props();

  const depth = $derived(
    node.path === "/" ? 0 : node.path.split("/").length - 1,
  );
  let children: Node[] = $state.raw([]);

  async function setChildren() {
    if (node.type === "dir") {
      children = await getDirectoryNodes(node.path);
    }
  }

  let open = $state(true);

  let showActions = $state(false);
  // svelte-ignore non_reactive_update
  let actionsDiv: HTMLDivElement;

  const [floatingRef, floatingContent] = createFloatingActions({
    strategy: "absolute",
    placement: "left-start",
    middleware: [offset(6), flip(), shift()],
  });

  async function onClick() {
    if (node.type === "dir") {
      open = !open;
    } else {
      if (events.onFileNodeClick) {
        events.onFileNodeClick({ ...node });
      }
    }
  }

  async function onShowActionsClick() {
    showActions = true;
    await tick();
    actionsDiv.focus();
  }

  function onActionsFocusOut(
    event: FocusEvent & {
      currentTarget: EventTarget & HTMLDivElement;
    },
  ) {
    setTimeout(() => {
      if (!actionsDiv.contains(event.relatedTarget as HTMLElement)) {
        showActions = false;
      }
    }, 0);
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
  <button onclick={onShowActionsClick} use:floatingRef>
    <EllipsisVerticalIcon size="20" />
  </button>
</div>
{#if node.type === "dir"}
  <div hidden={!open} style="width: 100%;">
    {#await setChildren() then}
      {#each children.sort(sortNodes) as node}
        <Entry {node} {events} reloadParentFolder={setChildren} />
      {/each}
    {/await}
  </div>
{/if}

{#if showActions}
  <div
    style="position: absolute;"
    use:floatingContent
    role="menu"
    tabindex="-1"
    onfocusout={onActionsFocusOut}
    bind:this={actionsDiv}
  >
    <Actions
      {node}
      {reloadParentFolder}
      reloadCurrentFolder={setChildren}
      bind:showActions
      {events}
    />
  </div>
{/if}

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
    outline-style: none;
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
