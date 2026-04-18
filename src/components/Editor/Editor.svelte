<script lang="ts">
  import { EditorView } from "codemirror";
  import { onMount, onDestroy } from "svelte";
  import { generalExtensions, getLanguageExtensions } from "./extensions";
  import { type WorkerShape } from "@valtown/codemirror-ts/worker";
  import { keymap } from "@codemirror/view";
  import { formatFile } from "../../prettier";
  import pDebounce from "p-debounce";
  import { readFile, writeFile } from "@zenfs/core/promises";

  let {
    path,
    onDestroy: onDestroyComp,
    typescriptWorker,
  }: {
    path: string;
    onDestroy?: () => void;
    typescriptWorker: WorkerShape;
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
  });

  onDestroy(() => {
    view.destroy();
    if (onDestroyComp) onDestroyComp();
  });

  export const saveFile = pDebounce(async () => {
    const content = view.state.doc.toString();
    await writeFile(path, content);
  }, 500);

  export async function formatEditorContent() {
    const content = view.state.doc.toString();
    try {
      const cursorOffset = view.state.selection.main.to;
      const formatResult = await formatFile(content, path, cursorOffset);
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: formatResult.formatted,
        },
        selection: {
          anchor: formatResult.cursorOffset,
          head: formatResult.cursorOffset,
        },
      });
    } catch {}
  }

  function getFormatKeymap() {
    return keymap.of([
      {
        key: "Alt-Shift-f",
        run: () => {
          formatEditorContent();
          return true;
        },
      },
    ]);
  }

  function createEditorView(doc: string) {
    return new EditorView({
      parent: container,
      doc: doc,
      extensions: [
        generalExtensions,
        getFormatKeymap(),
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
          saveFile();
        }
      },
    });
  }
</script>

<div style="height: 100%;" bind:this={container}></div>
