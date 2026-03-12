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

export interface DirTree {
  [path: Path]: Node;
}

export interface Events {
  onCreated?: (nodes: Node[]) => void;
  onRenamed?: (from: Node, to: Node) => void;
  onDeleted?: (nodes: Node[]) => void;
  onFileNodeClick?: (node: Node) => void;
}
