import ts from "typescript";
import type { TextDocuments } from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import typescriptLibs from "./typescriptLibs";

export default class TypescriptHost implements ts.LanguageServiceHost {
  private readonly documents: TextDocuments<TextDocument>;
  private readonly compilerOptions: ts.CompilerOptions;
  private readonly extraTypesFiles: Record<string, string>;
  private readonly projectVersion: () => string;
  constructor(
    documents: TextDocuments<TextDocument>,
    compilerOptions: ts.CompilerOptions,
    extraTypesFiles: Record<string, string>,
    projectVersion: () => string,
  ) {
    this.documents = documents;
    this.compilerOptions = compilerOptions;
    this.extraTypesFiles = extraTypesFiles;
    this.projectVersion = projectVersion;
  }

  getCompilationSettings(): ts.CompilerOptions {
    return this.compilerOptions;
  }

  getCurrentDirectory(): string {
    return "/";
  }

  getDefaultLibFileName(options: ts.CompilerOptions): string {
    return ts.getDefaultLibFileName(options);
  }

  getScriptFileNames(): string[] {
    return [...this.documents.keys()];
  }

  getScriptVersion(fileName: string): string {
    const document = this.documents.get(fileName);
    return document ? String(document.version) : "1";
  }

  getProjectVersion(): string {
    return this.projectVersion();
  }

  getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    const text = this.readFile(fileName);
    return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
  }

  getScriptKind(): ts.ScriptKind {
    return ts.ScriptKind.JS;
  }

  fileExists(fileName: string): boolean {
    return (
      this.documents.keys().includes(fileName) ||
      fileName in typescriptLibs ||
      "lib." + fileName in typescriptLibs ||
      fileName in this.extraTypesFiles
    );
  }

  readFile(fileName: string): string | undefined {
    return (
      this.documents.get(fileName)?.getText() ??
      (typescriptLibs[fileName] ||
        typescriptLibs["lib." + fileName] ||
        this.extraTypesFiles[fileName])
    );
  }

  readDirectory(): string[] {
    return [...this.documents.keys()];
  }

  directoryExists(): boolean {
    return true;
  }

  getDirectories(): string[] {
    return [];
  }

  useCaseSensitiveFileNames(): boolean {
    return true;
  }

  getNewLine(): string {
    return "\n";
  }

  resolveModuleNames(
    moduleNames: string[],
    containingFile: string,
  ): (ts.ResolvedModule | undefined)[] {
    return moduleNames.map((moduleName) => {
      return ts.resolveModuleName(
        moduleName,
        containingFile,
        this.getCompilationSettings(),
        this,
      ).resolvedModule;
    });
  }
}
