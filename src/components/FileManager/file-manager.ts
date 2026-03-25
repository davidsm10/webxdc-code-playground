import { readdir, readFile } from "@zenfs/core/promises";
import type { Node } from "./types";
import { resolve } from "@zenfs/core/path";
import JSZip from "jszip";

export function sortNodes(a: Node, b: Node) {
  if (a.type !== b.type) {
    return a.type === "dir" ? -1 : 1;
  }
  if (a.name > b.name) return 1;
  if (a.name < b.name) return -1;
  return 0;
}

export function isValidName(name: string) {
  if (!name.trim()) return false;
  if (name.includes("/")) return false;
  return true;
}

export async function getFolderZip(path: string) {
  const zip = new JSZip();
  const files = await readdir(path, { withFileTypes: true, recursive: true });
  for (const file of files) {
    const path = resolve(file.parentPath, file.name);
    if (file.isDirectory()) {
      zip.folder(path);
    } else if (file.isFile()) {
      const content = await readFile(path);
      zip.file(path, content);
    }
  }
  return await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
}

export async function getDirectoryNodes(path: string): Promise<Node[]> {
  const entries = await readdir(path, { withFileTypes: true });
  return entries.map((entry) => ({
    type: entry.isDirectory() ? "dir" : "file",
    name: entry.name,
    path: resolve(path, entry.name),
  }));
}
