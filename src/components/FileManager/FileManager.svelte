<script lang="ts">
  import Entry from "./Entry.svelte";
  import type { DirNode, Events } from "./types";

  let events: Events = $props();

  const root: DirNode = {
    name: "/",
    path: "/",
    type: "dir",
  };
</script>

<div class="container">
  <Entry node={root} {events} reloadParentFolder={() => false} />
</div>

<style>
  .container {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
</style>
