import index_html from "../templates/webxdc/index.html?raw";
import style_css from "../templates/webxdc/style.css?raw";
import script_js from "../templates/webxdc/script.js?raw";
import manifest_toml from "../templates/webxdc/manifest.toml?raw";

export const files = [
  ["/index.html", index_html],
  ["/style.css", style_css],
  ["/script.js", script_js],
  ["/manifest.toml", manifest_toml],
];

export const tabs = ["/index.html", "/script.js", "/manifest.toml"];
