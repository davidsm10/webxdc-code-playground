import { readdir } from "@zenfs/core/promises";
import type { DirTree, Node } from "./types";
import { resolve } from "@zenfs/core/path";

export async function getDirTree(path: string): Promise<DirTree> {
  const entries = await readdir(path, { withFileTypes: true });
  let tree: DirTree = {};
  entries.forEach((entry) => {
    const nodePath = resolve(path, entry.name);
    tree[nodePath] = {
      name: entry.name,
      path: resolve(path, entry.name),
      type: entry.isDirectory() ? "dir" : "file",
    };
  });
  return tree;
}

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
