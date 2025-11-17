<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { basicSetup, EditorView } from "codemirror";
  import { autocompletion } from "@codemirror/autocomplete";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { html } from "@codemirror/lang-html";
  import { css } from "@codemirror/lang-css";
  import { javascript } from "@codemirror/lang-javascript";
  import localforage from "localforage";
  import { type WorkerShape } from "@valtown/codemirror-ts/worker";
  import { wrap } from "comlink";
  import {
    tsFacetWorker,
    tsSyncWorker,
    tsLinterWorker,
    tsAutocompleteWorker,
    tsHoverWorker,
  } from "@valtown/codemirror-ts";


  let {
    name,
    hidden,
    value = $bindable(),
  }: { name: string; hidden: boolean; value: string } = $props();

  // svelte-ignore non_reactive_update
  let lang: Function | undefined;
  if (name.endsWith(".html")) {
    lang = html;
  } else if (name.endsWith(".css")) {
    lang = css;
  } else if (name.endsWith(".js")) {
    lang = javascript;
  }

  function onValueChange(value: string) {
    localforage.setItem(name, value);
  }

  async function getExtensions() {
    if (name === "index.js") {
      const innerWorker = new Worker(
        new URL("../typescript/lsp-worker.ts", import.meta.url),
        {
          type: "module",
        }
      );
      const worker = wrap<WorkerShape>(innerWorker);
      await worker.initialize();
      const path = "index.js";
      return [
        basicSetup,
        tsFacetWorker.of({ worker, path }),
        tsSyncWorker(),
        tsLinterWorker(),
        autocompletion({
          override: [tsAutocompleteWorker()],
        }),
        tsHoverWorker(),
      ];
    } else {
      return [basicSetup];
    }
  }

  async function onReady(view: EditorView) {
    view.contentDOM.setAttribute("spellcheck", "false");
    view.contentDOM.setAttribute("autocorrect", "off");
    view.contentDOM.setAttribute("autocapitalize", "off");
    view.contentDOM.setAttribute("autocomplete", "off");
  }
</script>

<div style="height: 100%;" {hidden}>
  {#await getExtensions() then extensions}
    <CodeMirror
      styles={{
        "&": { height: "100%" },
        ".cm-scroller": { "overflow-y": "auto" },
      }}
      {extensions}
      lineWrapping={true}
      theme={oneDark}
      lang={lang && lang()}
      bind:value
      onchange={onValueChange}
      onready={onReady}
    />
  {/await}
</div>
