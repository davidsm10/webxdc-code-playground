<script lang="ts">
  import eruda from "eruda?raw";

  let { filesContents }: { filesContents: string[] } = $props();

  function getHtml() {
    const dom = new DOMParser().parseFromString(filesContents[0], "text/html");
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
        script.textContent = "window.webxdc = window.parent.webxdc;";
      }
      if (path === "/index.js") {
        script.removeAttribute("src");
        script.textContent = filesContents[2];
      }
    }

    return `<!DOCTYPE html>\n` + dom.documentElement.outerHTML;
  }
</script>

<iframe
  title="Preview"
  srcdoc={getHtml()}
  frameborder="0"
  width="100%"
  height="100%"
></iframe>
