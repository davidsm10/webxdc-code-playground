import {
  createSystem,
  createVirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import { expose } from "comlink";
import ts, { ScriptTarget } from "typescript";
import { createWorker } from "@valtown/codemirror-ts/worker";
import webxdctypes from "@webxdc/types/webxdc.d.ts?raw";
import globalWebxdctypes from "@webxdc/types/global.d.ts?raw";

const typescriptLibFiles = import.meta.glob("./lib.*.d.ts", {
  base: "../../node_modules/typescript/lib/",
  query: "?raw",
  import: "default",
});

expose(
  createWorker(async function () {
    const fsMap = new Map<string, string>();

    for (const path in typescriptLibFiles) {
      const content = await typescriptLibFiles[path]();
      //@ts-ignore
      fsMap.set(path.replace(".", ""), content);
    }

    fsMap.set("/webxdc.d.ts", webxdctypes);
    fsMap.set("/global.webxdc.d.ts", globalWebxdctypes);

    const system = createSystem(fsMap);
    const compilerOpts: ts.CompilerOptions = {
      target: ScriptTarget.ES2020,
      types: ["./global.webxdc.d.ts"],
      allowJs: true,
      checkJs: true,
    };
    const env = createVirtualTypeScriptEnvironment(
      system,
      [],
      ts,
      compilerOpts
    );
    env.createFile("index.js", "");
    return env;
  })
);
