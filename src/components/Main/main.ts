import localforage from "localforage";
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
