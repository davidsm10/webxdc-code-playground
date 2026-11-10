import localforage from "localforage";
import { configureSingle } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

export const generalDB = localforage.createInstance({
  name: "code-playground-general-database",
});

export const appAssetsDB = localforage.createInstance({
  name: "code-playground-assets-database",
});

export async function setupZenFSDB() {
  await configureSingle({
    backend: IndexedDB,
    storeName: "code-playground-fs-database",
  });
}

export async function persistStorage() {
  if (navigator.storage && navigator.storage.persist) {
    try {
      const persisted = await navigator.storage.persist();
      if (persisted) {
        console.log("Storage persisted");
      } else {
        console.log("Storage no persisted");
      }
    } catch (err) {
      console.log("Error persisting storage:", err);
    }
  } else {
    console.log("Persistent storage not available");
  }
}
