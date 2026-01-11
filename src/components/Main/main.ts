import localforage from "localforage";
import { readdir, readFile, writeFile } from "@zenfs/core/promises";
import JSZip from "jszip";
import { resolve } from "@zenfs/core/path";
import { configureSingle } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

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
    const list: string[] = await (await fetch("/template.json")).json();
    for (const path of list) {
      const content = await (await fetch("/template" + path)).text();
      await writeFile(path, content);
    }
  }
}

export async function exportWebxdc() {
  const zip = new JSZip();
  const files = await readdir("/", { withFileTypes: true, recursive: true });
  for (const file of files) {
    if (file.isDirectory()) continue;
    const path = resolve(file.parentPath, file.name);
    const content = await readFile(path);
    zip.file(path.replace("/", ""), content);
  }
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  window.webxdc.sendToChat({
    file: {
      name: "app.xdc",
      blob: zipBlob,
    },
  });
}
