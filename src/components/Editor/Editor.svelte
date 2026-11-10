<script lang="ts">
  import { EditorView } from "codemirror";
  import { onMount, onDestroy } from "svelte";
  import { generalExtensions, getLanguageExtensions } from "./extensions";
  import pDebounce from "p-debounce";
  import { readFile, writeFile } from "@zenfs/core/promises";

  let {
    path,
    onDestroy: onDestroyComp,
  }: {
    path: string;
    onDestroy?: () => void;
  } = $props();

  // svelte-ignore non_reactive_update
  let container: HTMLDivElement;
  let view: EditorView;

  onMount(async () => {
    const content = await readFile(path, { encoding: "utf-8" });
    view = createEditorView(content);
    view.contentDOM.setAttribute("spellcheck", "false");
    view.contentDOM.setAttribute("autocorrect", "off");
    view.contentDOM.setAttribute("autocapitalize", "off");
    view.contentDOM.setAttribute("autocomplete", "off");
    focus();
  });

  onDestroy(() => {
    view.destroy();
    if (onDestroyComp) onDestroyComp();
  });

  export const saveFile = pDebounce(async () => {
    const content = view.state.doc.toString();
    await writeFile(path, content);
  }, 500);

  export function focus() {
    if (view) view.focus();
  }

  function createEditorView(doc: string) {
    return new EditorView({
      parent: container,
      doc: doc,
      extensions: [generalExtensions, getLanguageExtensions(path)],
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
          saveFile();
        }
      },
    });
  }
</script>

<div style="height: 100%;" bind:this={container}></div>
