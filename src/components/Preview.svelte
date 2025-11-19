<script lang="ts">
  import { PlusIcon, XIcon } from "@lucide/svelte";
  import webxdcJs from "../webxdc.js?raw";
  import eruda from "eruda?raw";

  let {
    filesContents,
    showPreview = $bindable(),
  }: { filesContents: string[]; showPreview: boolean } = $props();
  

  let devices = $state(["device1"]);
  let activeTab = $state("device1");

  //@ts-ignore
  window.fakeWebxdcUpdates = [];
  //@ts-ignore
  window.fakeWebxdcUpdateListeners = {};
  //@ts-ignore
  window.fakeWebxdcRealtimeListeners = {};

  function getHtml(device: string) {
    const dom = new DOMParser().parseFromString(
      filesContents[0],
      "text/html"
    );
    if (!dom.head) {
      dom.documentElement.append(dom.createElement("head"));
    }
    const erudaScript = dom.createElement("script");
    erudaScript.textContent = eruda;
    const startErudaScript = dom.createElement("script");
    startErudaScript.textContent = "eruda.init();";
    dom.head.prepend(startErudaScript);
    dom.head.prepend(erudaScript);

    const links = Object.values(dom.getElementsByTagName("link"));
    for (const link of links) {
      if (!link.href) continue;
      const path = new URL(link.href).pathname;
      if (path === "/index.css") {
        const style = dom.createElement("style");
        style.textContent = filesContents[1];
        link.replaceWith(style);
      }
    }

    const scripts = Object.values(dom.getElementsByTagName("script"));
    for (const script of scripts) {
      if (!script.src) continue;
      const path = new URL(script.src).pathname;
      if (path === "/webxdc.js") {
        script.removeAttribute("src");
        script.textContent = webxdcJs.replaceAll("$$device$$", device);
      }
      if (path === "/index.js") {
        script.removeAttribute("src");
        script.textContent = filesContents[2];
      }
    }

    return `<!DOCTYPE html>\n` + dom.documentElement.outerHTML;
  }

  function addDevice() {
    const next = "device" + (devices.length + 1);
    devices.push(next);
    activeTab = next;
  }
</script>

<div class="header">
  <div class="tabs">
    {#each devices as device}
      <button
        class={activeTab === device ? "tab active" : "tab"}
        onclick={() => (activeTab = device)}>{device}</button
      >
    {/each}
    <button class="tab" onclick={addDevice}>
      <PlusIcon size="15" />
    </button>
  </div>
  <div class="actions">
    <button class="action-btn" onclick={() => (showPreview = false)}>
      <XIcon size="15" />
    </button>
  </div>
</div>
<div class="content">
  {#each devices as device}
    <iframe
      title={device}
      srcdoc={getHtml(device)}
      frameborder="0"
      width={activeTab !== device ? "0" : "100%"}
      height={activeTab !== device ? "0" : "100%"}
    ></iframe>
  {/each}
</div>
