import index_html from "../templates/web/index.html?raw";
import style_css from "../templates/web/style.css?raw";
import script_js from "../templates/web/script.js?raw";

export const files = [
  ["/index.html", index_html],
  ["/style.css", style_css],
  ["/script.js", script_js],
];

export const tabs = ["/index.html", "/style.css", "/script.js"];
