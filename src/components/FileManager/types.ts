interface BaseNode {
  name: string;
  path: string;
}

export interface FileNode extends BaseNode {
  type: "file";
}

export interface DirNode extends BaseNode {
  type: "dir";
}

export type Node = FileNode | DirNode;

export interface DirTree {
  [path: string]: Node;
}
