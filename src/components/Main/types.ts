export interface Templates {
  [name: string]: {
    files: string[];
    tabs: { [id: string]: { name: string } };
  };
}
