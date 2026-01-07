<script lang="ts">
  import { EditorView } from "codemirror";
  import { onMount, onDestroy } from "svelte";
  import { generalExtensions, getLanguageExtensions } from "./extensions";
  import { writeFile, readFile } from "@zenfs/core/promises";
  import { type WorkerShape } from "@valtown/codemirror-ts/worker";

  let {
    path,
    typescriptWorker,
  }: { path: string; typescriptWorker: WorkerShape } = $props();

  // svelte-ignore non_reactive_update
  let container: HTMLDivElement;
  let view: EditorView;

  onMount(async () => {
    const savedDoc = await readFile(path, { encoding: "utf-8" });
    view = createEditorView(savedDoc);
    view.contentDOM.setAttribute("spellcheck", "false");
    view.contentDOM.setAttribute("autocorrect", "off");
    view.contentDOM.setAttribute("autocapitalize", "off");
    view.contentDOM.setAttribute("autocomplete", "off");
  });

  onDestroy(() => {
    view.destroy();
  });

  function createEditorView(doc: string) {
    return new EditorView({
      parent: container,
      doc: doc,
      extensions: [
        generalExtensions,
        getLanguageExtensions(path, typescriptWorker),
      ],
      dispatchTransactions: (transactions) => {
        view.update(transactions);
        let hasChanged = false;
        for (const transaction of transactions) {
          if (transaction.docChanged) {
            hasChanged = true;
            break;
          }
        }
        if (hasChanged) {
          writeFile(path, view.state.doc.toString());
        }
      },
    });
  }
</script>

<div style="height: 100%;" bind:this={container}></div>
