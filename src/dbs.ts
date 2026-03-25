import localforage from "localforage";
import { configureSingle } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

export const generalDB = localforage.createInstance({
  name: "code-playground-general-database",
});

export async function setupZenFSDB() {
  await configureSingle({
    backend: IndexedDB,
    storeName: "code-playground-fs-database",
  });
}
