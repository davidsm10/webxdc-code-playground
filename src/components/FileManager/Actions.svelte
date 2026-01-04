<script lang="ts">
  import {
    CaseSensitiveIcon,
    CheckIcon,
    CopyIcon,
    FilePlusIcon,
    FolderPlusIcon,
    ImportIcon,
    Trash,
  } from "@lucide/svelte";
  import type { DirTree, Node } from "./types";
  import {
    mkdir,
    exists,
    writeFile,
    unlink,
    rm,
    rename,
  } from "@zenfs/core/promises";
  import { resolve, dirname } from "@zenfs/core/path";
  import { isValidName } from "./util";
  import { openTabs } from "../../state.svelte";
  import { copyText } from "../../util";
  import { tick } from "svelte";

  let {
    node = $bindable(),
    dirTree = $bindable(),
    children = $bindable(),
    showActions = $bindable(),
  }: {
    dirTree: DirTree;
    node: Node;
    children: DirTree;
    showActions: boolean;
  } = $props();

  let nodeAction: null | "newfile" | "newdir" | "rename" = $state(null);
  // svelte-ignore non_reactive_update
  let nameInput: HTMLInputElement;

  async function createNode() {
    const name = nameInput.value;
    let type: "file" | "dir" = "file";
    if (nodeAction === "newdir") {
      type = "dir";
    }
    try {
      if (!isValidName(name)) {
        throw new Error("Invalid name");
      }
      const path = resolve(node.path, name);
      if (await exists(path)) {
        throw new Error("File already exists");
      }
      if (type === "dir") {
        await mkdir(path);
      } else {
        await writeFile(path, "");
      }
      children[path] = { type, name, path };
      showActions = false;
    } catch (err) {
      console.log(err);
    }
  }

  async function importFiles() {
    try {
      const files = await window.webxdc.importFiles({ multiple: true });
      for (const file of files) {
        const path = resolve(node.path, file.name);
        if (await exists(path)) {
          continue;
        }
        await writeFile(path, new Uint8Array(await file.arrayBuffer()));
        children[path] = { type: "file", name: file.name, path };
      }

      showActions = false;
    } catch (err) {
      console.log(err);
    }
  }

  async function deleteNode() {
    try {
      if (node.type === "file") {
        await unlink(node.path);
        if (Object.keys(openTabs).includes(node.path)) {
          delete openTabs.tabs[node.path];
        }
      } else {
        await rm(node.path, { recursive: true, force: true });
      }
      delete dirTree[node.path];
      showActions = false;
    } catch (err) {
      console.log(err);
    }
  }

  async function renameNode() {
    const name = nameInput.value;
    try {
      if (!isValidName(name)) {
        throw new Error("Invalid name");
      }
      const path = resolve(dirname(node.path), name);
      if (await exists(path)) {
        throw new Error("File already exists");
      }

      await rename(node.path, path);
      dirTree[path] = { type: node.type, name, path };
      delete dirTree[node.path];
      showActions = false;
    } catch (err) {
      console.log(err);
    }
  }

  function copyPath() {
    copyText(node.path);
    showActions = false;
  }

  async function showNameForm(type: "newfile" | "newdir" | "rename") {
    nodeAction = type;
    await tick();
    nameInput.focus();
  }
</script>

<div class="container">
  {#if nodeAction}
    <form
      class="new-node-form"
      onsubmit={(e) => {
        e.preventDefault();
        if (nodeAction === "rename") {
          renameNode();
        } else {
          createNode();
        }
      }}
    >
      <input
        value={nodeAction === "rename" ? node.name : ""}
        type="text"
        placeholder="Name"
        bind:this={nameInput}
        required
        autocapitalize="off"
        autocorrect="off"
      />
      <button>
        <CheckIcon size="20" />
      </button>
    </form>
  {:else}
    <div class="actions">
      {#if node.type === "dir"}
        <button onclick={() => showNameForm("newdir")}>
          <FolderPlusIcon size="20" />
          New folder
        </button>

        <button onclick={() => showNameForm("newfile")}>
          <FilePlusIcon size="20" />
          New file
        </button>

        <button onclick={importFiles}>
          <ImportIcon size="20" />
          Import files
        </button>
      {/if}
      <button onclick={copyPath}>
        <CopyIcon size="20" />
        Copy path
      </button>
      {#if node.path !== "/" && node.path !== "/index.html"}
        <button onclick={() => showNameForm("rename")}>
          <CaseSensitiveIcon size="20" />
          Rename
        </button>
        <button onclick={deleteNode}>
          <Trash size="20" />
          Delete
        </button>
      {/if}
    </div>
  {/if}
</div>

<style>
  button {
    cursor: pointer;
    display: flex;
    gap: 3px;
    align-items: center;
    border: none;
    padding: 5px;
  }

  input {
    border: none;
    border-radius: 3px;
    padding: 5px;
    outline: none;
  }

  .container {
    min-width: 200px;
    width: 100%;
    height: 100%;
    background-color: #1c1f27;
  }

  .actions {
    border: 0.5px solid #3a3f4b;
    display: flex;
    flex-direction: column;
  }

  .new-node-form {
    display: flex;
    align-items: center;
    gap: 5px;
    height: 30px;
    padding: 5px;
  }

  .new-node-form button {
    border-radius: 5px;
    background-color: #3a3f4b;
  }

  .new-node-form input {
    background-color: #3a3f4b;
  }

  .actions button {
    background: transparent;
    color: #abb2bf;
    border-bottom: 0.1px solid #3a3f4b;
  }

  .actions button:hover,
  .new-node-form button:hover {
    background-color: #454b5a;
    color: #fff;
  }

  .actions button:focus,
  .new-node-form button:focus {
    outline: none;
    background-color: #4b5263;
    color: #fff;
  }

  .actions button:active,
  .new-node-form button:active {
    background-color: #576073;
    color: #fff;
  }
</style>
