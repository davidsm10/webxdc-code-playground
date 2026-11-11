import Entry from "./entry/entry";
import { readdir, readFile } from "@zenfs/core/promises";
import { resolve } from "@zenfs/core/path";
import JSZip from "jszip";
import { exportFile } from "../../util";

const root: DirNode = {
  name: "/",
  path: "/",
  type: "dir",
};

export default function FileManager(props: Events) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
      }}
    >
      <Entry node={root} events={props} reloadParentFolder={() => false} />
    </div>
  );
}

export type Path = `/${string}`;

interface BaseNode {
  name: string;
  path: Path;
}

export interface FileNode extends BaseNode {
  type: "file";
}

export interface DirNode extends BaseNode {
  type: "dir";
}

export type Node = FileNode | DirNode;

export interface Events {
  onCreated?: (node: Node) => void;
  onRenamed?: (from: Node, to: Node) => void;
  onDeleted?: (node: Node) => void;
  onFileNodeClick?: (node: Node) => void;
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

export async function getFolderZip(folderPath: string) {
  const zip = new JSZip();
  const files = await readdir(folderPath, {
    withFileTypes: true,
    recursive: true,
  });
  for (const file of files) {
    const path = resolve(file.parentPath, file.name);
    if (file.isDirectory()) {
      zip.folder(path.replace("/", ""));
    } else if (file.isFile()) {
      const absolutePath = resolve(folderPath, file.parentPath, file.name);
      const content = await readFile(absolutePath);
      zip.file(path.replace("/", ""), content);
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

export async function exportNodeAsFile(node: Node) {
  let blob: Blob;
  let name: string;
  if (node.type === "file") {
    blob = new Blob([(await readFile(node.path)) as Uint8Array<ArrayBuffer>]);
    name = node.name;
  } else {
    blob = await getFolderZip(node.path);
    name = node.name;
    if (node.path === "/") {
      name = "app";
    }
    name += ".zip";
  }

  await exportFile(blob, name);
}
