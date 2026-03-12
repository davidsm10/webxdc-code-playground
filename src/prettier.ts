import { formatWithCursor } from "prettier";
import estree from "prettier/plugins/estree";
import html from "prettier/plugins/html";
import postcss from "prettier/plugins/postcss";
import babel from "prettier/plugins/babel";

export async function formatFile(
  source: string,
  path: string,
  cursorOffset: number,
) {
  return await formatWithCursor(source, {
    filepath: path,
    plugins: [html, postcss, babel, estree],
    cursorOffset,
  });
}
