<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { basicSetup, EditorView } from "codemirror";
  import { autocompletion } from "@codemirror/autocomplete";
  import { oneDark } from "@codemirror/theme-one-dark";
  import { html } from "@codemirror/lang-html";
  import { css } from "@codemirror/lang-css";
  import { javascript } from "@codemirror/lang-javascript";
  import { json } from "@codemirror/lang-json";
  import { writeFile, readFile } from "@zenfs/core/promises";
  import { type WorkerShape } from "@valtown/codemirror-ts/worker";
  import {
    tsFacetWorker,
    tsSyncWorker,
    tsLinterWorker,
    tsAutocompleteWorker,
    tsHoverWorker,
  } from "@valtown/codemirror-ts";
  import { jsCompletions } from "./js-completions";

  let {
    path,
    typescriptWorker,
  }: { path: string; typescriptWorker: WorkerShape } = $props();

  async function getExtensions() {
    if (path.endsWith(".js")) {
      return [
        basicSetup,
        javascript(),
        tsFacetWorker.of({
          worker: typescriptWorker,
          path: path.replace("/", ""),
        }),
        tsSyncWorker(),
        tsLinterWorker(),
        autocompletion({
          override: [tsAutocompleteWorker(), jsCompletions],
        }),
        tsHoverWorker(),
      ];
    } else if (path.endsWith(".html")) {
      return [basicSetup, html()];
    } else if (path.endsWith(".css")) {
      return [basicSetup, css()];
    } else if (path.endsWith(".json")) {
      return [basicSetup, json()];
    }

    return [basicSetup];
  }

  async function onReady(view: EditorView) {
    view.contentDOM.setAttribute("spellcheck", "false");
    view.contentDOM.setAttribute("autocorrect", "off");
    view.contentDOM.setAttribute("autocapitalize", "off");
    view.contentDOM.setAttribute("autocomplete", "off");
  }
</script>

{#await readFile(path, { encoding: "utf-8" }) then value}
  {#await getExtensions() then extensions}
    <CodeMirror
      styles={{
        "&": { height: "100%" },
        ".cm-scroller": { "overflow-y": "auto" },
      }}
      {extensions}
      lineWrapping={true}
      theme={oneDark}
      {value}
      onchange={(val) => writeFile(path, val)}
      onready={onReady}
    />
  {/await}
{/await}
