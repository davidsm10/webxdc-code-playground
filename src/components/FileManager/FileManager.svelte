<script lang="ts">
  import Entry from "./Entry.svelte";
  import type { DirNode } from "./types";

  const root: DirNode = {
    name: "/",
    path: "/",
    type: "dir",
  };
</script>

<div class="container">
  <Entry dirTree={{ "/": root }} node={root} />
</div>

<style>
  .container {
    width: 100%;
    height: 100%;
    overflow: auto;
  }
</style>
