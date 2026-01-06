<script lang="ts">
  import CodeMirror from "svelte-codemirror-editor";
  import { EditorView } from "codemirror";
  import { generalExtensions, getLanguageExtensions } from "./extensions";
  import { writeFile, readFile } from "@zenfs/core/promises";
  import { type WorkerShape } from "@valtown/codemirror-ts/worker";

  let {
    path,
    typescriptWorker,
  }: { path: string; typescriptWorker: WorkerShape } = $props();

  async function onReady(view: EditorView) {
    view.contentDOM.setAttribute("spellcheck", "false");
    view.contentDOM.setAttribute("autocorrect", "off");
    view.contentDOM.setAttribute("autocapitalize", "off");
    view.contentDOM.setAttribute("autocomplete", "off");
  }
</script>

{#await readFile(path, { encoding: "utf-8" }) then value}
  <CodeMirror
    styles={{
      "&": { height: "100%" },
      ".cm-scroller": { "overflow-y": "auto" },
    }}
    extensions={[
      generalExtensions,
      getLanguageExtensions(path, typescriptWorker),
    ]}
    {value}
    onchange={(val) => writeFile(path, val)}
    onready={onReady}
  />
{/await}
