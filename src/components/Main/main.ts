import localforage from "localforage";
import { readdir, writeFile } from "@zenfs/core/promises";
import { configureSingle } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import type { Template } from "./types";
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
    const template: Template = await (await fetch("template.json")).json();
    for (const path of template.files) {
      const content = await (await fetch("template" + path)).text();
      await writeFile(path, content);
    }

    openTabs.tabs = template.tabs;
  }
}
