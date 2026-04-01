<script lang="ts">
  let { entryPath }: { entryPath: string } = $props();
</script>

{#await navigator.serviceWorker.ready}
  Waiting until service worker is active
{:then}
  <iframe
    title={"Preview: " + entryPath}
    src={entryPath}
    frameborder="0"
    width="100%"
    height="100%"
  ></iframe>
{/await}
