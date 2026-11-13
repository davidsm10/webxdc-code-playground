import {
  createConnection,
  MessageReader,
  MessageWriter,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
  type Connection,
  type ServerCapabilities,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import JavascriptLanguageService from "./service";
import TypescriptHost from "./typescriptHost";
import ts, { ScriptTarget } from "typescript";
import { webxdcTypes } from "./webxdcTypes";
import {
  CustomMessageReader,
  CustomMessageWriter,
  type ServerLspMessage,
} from "../server";
import type { ClientMessage } from "../client";

declare let self: Worker;

const capabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  hoverProvider: true,
  completionProvider: {
    triggerCharacters: [".", "/", '"', "'", "<"],
  },
  signatureHelpProvider: {
    triggerCharacters: ["(", ",", "<"],
    retriggerCharacters: [")"],
  },
  documentFormattingProvider: true,
};

class JavascriptLsp {
  private projectVersion: number;
  documents: TextDocuments<TextDocument>;
  connection: Connection;
  service: JavascriptLanguageService;

  constructor(reader: MessageReader, writer: MessageWriter) {
    this.projectVersion = 0;
    this.documents = new TextDocuments(TextDocument);

    const typescriptCompilerOptions: ts.CompilerOptions = {
      target: ScriptTarget.ES2022,
      lib: ["es2022", "dom", "dom.iterable"],
      types: ["@webxdc/types/global"],
      noEmit: true,
      module: ts.ModuleKind.ES2022,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      skipLibCheck: true,
      allowJs: true,
      checkJs: true,
    };
    const typescriptHost = new TypescriptHost(
      this.documents,
      typescriptCompilerOptions,
      webxdcTypes,
      () => String(this.projectVersion),
    );
    const typescriptService = ts.createLanguageService(
      typescriptHost,
      ts.createDocumentRegistry(true, "/"),
    );
    this.service = new JavascriptLanguageService(typescriptService);

    this.connection = createConnection(ProposedFeatures.all, reader, writer);
    this.setupListeners();
    this.documents.listen(this.connection);
    this.connection.listen();
  }

  setupListeners() {
    this.connection.onInitialize(() => {
      return {
        capabilities,
      };
    });
    this.documents.onDidOpen((e) => {
      this.projectVersion++;
      this.sendDiagnostics(e.document.uri);
    });
    this.documents.onDidChangeContent((e) => {
      this.projectVersion++;
      this.sendDiagnostics(e.document.uri);
    });
    this.documents.onDidClose(() => this.projectVersion++);

    this.connection.onHover((params) => {
      const document = this.getDocument(params.textDocument.uri);
      return this.service.doHover(document, params.position);
    });

    this.connection.onCompletion((params) => {
      const document = this.getDocument(params.textDocument.uri);
      return this.service.doComplete(document, params.position);
    });

    this.connection.onSignatureHelp((params) => {
      const document = this.getDocument(params.textDocument.uri);
      return this.service.signatureHelp(
        document,
        params.position,
        params.context,
      );
    });

    this.connection.onDocumentFormatting((params) => {
      const document = this.getDocument(params.textDocument.uri);
      return this.service.format(document, params.options);
    });
  }

  sendDiagnostics(uri: string) {
    const document = this.getDocument(uri);
    this.connection.sendDiagnostics({
      uri: uri,
      version: document.version,
      diagnostics: this.service.doValidation(document),
    });
  }

  getDocument(uri: string) {
    const document = this.documents.get(uri);
    if (!document) {
      throw new Error(`Document with uri "${uri}" not found`);
    }

    return document;
  }
}

const reader = new CustomMessageReader();
self.addEventListener("message", (event: MessageEvent<ClientMessage>) => {
  if (event.data.type === "client-lsp") {
    reader.writeMessage(JSON.parse(event.data.message));
  }
});

const writer = new CustomMessageWriter((message) => {
  self.postMessage({
    type: "server-lsp",
    message: JSON.stringify(message),
  } as ServerLspMessage);
});

new JavascriptLsp(reader, writer);
