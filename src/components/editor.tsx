import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import pDebounce from "p-debounce";
import { readFile, writeFile } from "@zenfs/core/promises";
import { oneDark } from "@codemirror/theme-one-dark";
import { LanguageSupport } from "@codemirror/language";
import { htmlLanguage, autoCloseTags } from "@codemirror/lang-html";
import { css, cssLanguage } from "@codemirror/lang-css";
import { jsonLanguage } from "@codemirror/lang-json";
import {
  javascript,
  javascriptLanguage,
  snippets,
} from "@codemirror/lang-javascript";
import { completeFromList, ifNotIn } from "@codemirror/autocomplete";
import { lspClients } from "../lsp/client";

function htmlExtension(uri: string) {
  return new LanguageSupport(htmlLanguage, [
    autoCloseTags,
    lspClients.html.plugin(uri),
    css().support,
    javascript().support,
  ]);
}

function cssExtension(uri: string) {
  return new LanguageSupport(cssLanguage, [lspClients.css.plugin(uri)]);
}

function jsonExtension(uri: string) {
  return new LanguageSupport(jsonLanguage, [lspClients.json.plugin(uri)]);
}

function javascriptExtension(uri: string) {
  return new LanguageSupport(javascriptLanguage, [
    jsSnippetsCompletion(),
    lspClients.javascript.plugin(uri),
  ]);
}

function jsSnippetsCompletion() {
  let kwCompletion = (name: string) => ({ label: name, type: "keyword" });
  const keywords =
    "break case const continue default delete export extends false finally in instanceof let new return static super switch this throw true typeof var yield"
      .split(" ")
      .map(kwCompletion);

  const dontComplete = [
    "TemplateString",
    "String",
    "RegExp",
    "LineComment",
    "BlockComment",
    "VariableDefinition",
    "TypeDefinition",
    "Label",
    "PropertyDefinition",
    "PropertyName",
    "PrivatePropertyDefinition",
    "PrivatePropertyName",
    "JSXText",
    "JSXAttributeValue",
    "JSXOpenTag",
    "JSXCloseTag",
    "JSXSelfClosingTag",
    ".",
    "?.",
  ];

  let completions = snippets.concat(keywords);
  return javascriptLanguage.data.of({
    autocomplete: ifNotIn(dontComplete, completeFromList(completions)),
  });
}

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
    extensions.push(htmlExtension(`file://${path}`));
  } else if (path.endsWith(".css")) {
    extensions.push(cssExtension(`file://${path}`));
  } else if (path.endsWith(".json")) {
    extensions.push(jsonExtension(`file://${path}`));
  } else if (path.endsWith(".js")) {
    extensions.push(javascriptExtension(`file://${path}`));
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
  const editorView = useRef<EditorView>(null);

  useEffect(() => {
    const loadEditor = async () => {
      const content = await readFile(props.path, { encoding: "utf-8" });
      const view = createEditorView(content, container.current!, props.path);
      view.contentDOM.setAttribute("spellcheck", "false");
      view.contentDOM.setAttribute("autocorrect", "off");
      view.contentDOM.setAttribute("autocapitalize", "off");
      view.contentDOM.setAttribute("autocomplete", "off");
      editorView.current = view;
      props.onMount(view);
    };

    loadEditor();

    return () => {
      editorView.current?.destroy();
      props.onDestroy();
    };
  }, []);

  return <div ref={container} style={{ height: "100%" }}></div>;
}
