<script lang="ts">
  import { EditorView } from "codemirror";
  import { onMount, onDestroy } from "svelte";
  import { generalExtensions, getLanguageExtensions } from "./extensions";
  import { type WorkerShape } from "@valtown/codemirror-ts/worker";
  import { keymap } from "@codemirror/view";
  import { formatFile } from "../../prettier";

  let {
    path,
    initialValue,
    onChange,
    onDestroy: onDestroyComp,
    typescriptWorker,
  }: {
    path: string;
    initialValue: string;
    onChange?: (value: string) => void;
    onDestroy?: () => void;
    typescriptWorker: WorkerShape;
  } = $props();

  // svelte-ignore non_reactive_update
  let container: HTMLDivElement;
  let view: EditorView;

  onMount(async () => {
    view = createEditorView(initialValue);
    view.contentDOM.setAttribute("spellcheck", "false");
    view.contentDOM.setAttribute("autocorrect", "off");
    view.contentDOM.setAttribute("autocapitalize", "off");
    view.contentDOM.setAttribute("autocomplete", "off");
  });

  onDestroy(() => {
    view.destroy();
    if (onDestroyComp) onDestroyComp();
  });

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
          if (onChange) {
            onChange(view.state.doc.toString());
          }
        }
      },
    });
  }
</script>

<div style="height: 100%;" bind:this={container}></div>
