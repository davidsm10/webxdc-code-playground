<script lang="ts">
  import eruda from "eruda?raw";
  import { exists, readFile } from "@zenfs/core/promises";

  let { entryPath }: { entryPath: string } = $props();

  async function getHtml(entryPath: string) {
    const entry = await readFile(entryPath, { encoding: "utf-8" });
    const dom = new DOMParser().parseFromString(entry, "text/html");
    if (!dom.head) {
      dom.documentElement.append(dom.createElement("head"));
    }

    const links = Object.values(dom.getElementsByTagName("link"));
    for (const link of links) {
      if (!link.href) continue;
      const path = new URL(link.href).pathname;
      if (await exists(path)) {
        const style = dom.createElement("style");
        const content = await readFile(path, { encoding: "utf-8" });
        style.textContent = content;
        link.replaceWith(style);
      }
    }

    const scripts = Object.values(dom.getElementsByTagName("script"));
    for (const script of scripts) {
      if (!script.src) continue;
      const path = new URL(script.src).pathname;
      if (path === "/webxdc.js") {
        script.removeAttribute("src");
        script.textContent = "window.webxdc = window.parent.webxdc;";
      } else if (await exists(path)) {
        script.removeAttribute("src");
        const content = await readFile(path, { encoding: "utf-8" });
        script.textContent = content;
      }
    }

    const erudaScript = dom.createElement("script");
    erudaScript.textContent = eruda + "\neruda.init();";
    dom.head.prepend(erudaScript);

    return `<!DOCTYPE html>\n` + dom.documentElement.outerHTML;
  }
</script>

{#await getHtml(entryPath) then html}
  <iframe
    title="Preview"
    srcdoc={html}
    frameborder="0"
    width="100%"
    height="100%"
  ></iframe>
{/await}
