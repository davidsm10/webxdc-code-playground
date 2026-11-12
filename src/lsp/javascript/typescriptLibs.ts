const typescriptLibFiles = import.meta.glob("./lib.*.ts", {
  base: "../../../node_modules/typescript/lib/",
  query: "?raw",
  import: "default",
  eager: true,
});

const typescriptLibs: Record<string, string> = {};
for (const path of Object.keys(typescriptLibFiles)) {
  const newPath = path.slice(2);
  typescriptLibs[newPath] = typescriptLibFiles[path];
}

export default typescriptLibs;
