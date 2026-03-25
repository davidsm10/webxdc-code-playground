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
