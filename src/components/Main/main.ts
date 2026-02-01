import localforage from "localforage";
import { readdir, readFile, writeFile } from "@zenfs/core/promises";
import JSZip from "jszip";
import { resolve } from "@zenfs/core/path";
import { configureSingle } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { downloadFile } from "../../util";
import type { Templates } from "./types";
import { openTabs } from "../Tabs/state.svelte";

export const generalDB = localforage.createInstance({
  name: "code-playground-general-database",
});

export const setupZenFSDB = async () => {
  await configureSingle({
    backend: IndexedDB,
    storeName: "code-playground-fs-database",
  });
};

export async function setupTemplate() {
  if (!(await readdir("/")).length) {
    const templates: Templates = await (
      await fetch("templates/templates.json")
    ).json();
    let name: string;
    if (window.webxdc) {
      name = "webxdc";
    } else {
      name = "web";
    }
    const template = templates[name];
    for (const path of template.files) {
      const content = await (await fetch(`templates/${name}/${path}`)).text();
      await writeFile(path, content);
    }

    openTabs.tabs = template.tabs;
  }
}

export async function getResultZip() {
  const zip = new JSZip();
  const files = await readdir("/", { withFileTypes: true, recursive: true });
  for (const file of files) {
    if (file.isDirectory()) continue;
    const path = resolve(file.parentPath, file.name);
    const content = await readFile(path);
    zip.file(path.replace("/", ""), content);
  }
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export async function exportResult() {
  const outputZip = await getResultZip();
  if (window.webxdc) {
    window.webxdc.sendToChat({
      file: {
        name: "app.xdc",
        blob: outputZip,
      },
    });
  } else {
    downloadFile(outputZip, "app.zip");
  }
}
