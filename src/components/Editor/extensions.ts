import { basicSetup } from "codemirror";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView } from "codemirror";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";

export const generalExtensions = [
  basicSetup,
  oneDark,
  EditorView.theme({
    "&": { height: "100%" },
    ".cm-scroller": { "overflow-y": "auto" },
  }),
  EditorView.lineWrapping,
];

export function getLanguageExtensions(path: string) {
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
