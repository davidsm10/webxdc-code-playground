import { useEffect, useState, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import pDebounce from "p-debounce";
import { readFile, writeFile } from "@zenfs/core/promises";
import { oneDark } from "@codemirror/theme-one-dark";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { json } from "@codemirror/lang-json";
import { javascript } from "@codemirror/lang-javascript";

const generalExtensions = [
  basicSetup,
  oneDark,
  EditorView.theme({
    "&": { height: "100%" },
    ".cm-scroller": { "overflow-y": "auto" },
  }),
  EditorView.lineWrapping,
];

function getLanguageExtensions(path: string) {
  let extensions = [];
  if (path.endsWith(".html")) {
    extensions.push(html());
  } else if (path.endsWith(".css")) {
    extensions.push(css());
  } else if (path.endsWith(".json")) {
    extensions.push(json());
  } else if (path.endsWith(".js")) {
    extensions.push(javascript());
  }

  return extensions;
}

function createEditorView(doc: string, container: Element, path: string) {
  const debouncedWriteFile = pDebounce(writeFile, 500);
  return new EditorView({
    parent: container,
    doc: doc,
    extensions: [generalExtensions, getLanguageExtensions(path)],
    dispatchTransactions: (transactions, view) => {
      view.update(transactions);
      let hasChanged = false;
      for (const transaction of transactions) {
        if (transaction.docChanged) {
          hasChanged = true;
          break;
        }
      }
      if (hasChanged) {
        const content = view.state.doc.toString();
        debouncedWriteFile(path, content);
      }
    },
  });
}

export default function Editor(props: {
  path: string;
  onMount: (editorView: EditorView) => void;
  onDestroy: () => void;
}) {
  const container = useRef(null);
  const [editorView, setEditorView] = useState<EditorView>();

  useEffect(() => {
    const loadEditor = async () => {
      const content = await readFile(props.path, { encoding: "utf-8" });
      const editorView = createEditorView(
        content,
        container.current!,
        props.path,
      );
      editorView.contentDOM.setAttribute("spellcheck", "false");
      editorView.contentDOM.setAttribute("autocorrect", "off");
      editorView.contentDOM.setAttribute("autocapitalize", "off");
      editorView.contentDOM.setAttribute("autocomplete", "off");
      setEditorView(editorView);
      props.onMount(editorView);
    };

    loadEditor();

    return () => {
      editorView?.destroy();
      props.onDestroy();
    };
  }, []);

  return <div ref={container} style={{ height: "100%" }}></div>;
}
