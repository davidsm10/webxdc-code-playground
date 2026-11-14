import {
  type LanguageService,
  getLanguageService,
  type JSONDocument,
} from "vscode-json-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  type Connection,
  TextDocumentSyncKind,
  type ServerCapabilities,
  MessageReader,
  MessageWriter,
} from "vscode-languageserver/browser";
import {
  CustomMessageReader,
  CustomMessageWriter,
  type ServerLspMessage,
  type ServerReadyMessage,
} from "./server";
import type { ClientMessage } from "./client";

declare let self: Worker;

export interface CachedParsedDocument {
  version: number;
  parsedDocument: JSONDocument;
}

const capabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  hoverProvider: true,
  completionProvider: {},
  documentFormattingProvider: true,
};

class JsonLsp {
  documents: TextDocuments<TextDocument>;
  connection: Connection;
  service: LanguageService;
  cachedParsedDocuments: Map<string, CachedParsedDocument>;

  constructor(reader: MessageReader, writer: MessageWriter) {
    this.documents = new TextDocuments(TextDocument);
    this.service = getLanguageService({});
    this.cachedParsedDocuments = new Map();
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

    this.documents.onDidOpen((e) => this.sendDiagnostics(e.document.uri));

    this.documents.onDidChangeContent((e) =>
      this.sendDiagnostics(e.document.uri),
    );

    this.documents.onDidClose((e) => {
      this.cachedParsedDocuments.delete(e.document.uri);
    });

    this.connection.onCompletion((params) => {
      const document = this.getDocument(params.textDocument.uri);
      const parsedDocument = this.getParsedDocument(document);
      return this.service.doComplete(document, params.position, parsedDocument);
    });

    this.connection.onHover((params) => {
      const document = this.getDocument(params.textDocument.uri);
      const parsedDocument = this.getParsedDocument(document);
      return this.service.doHover(document, params.position, parsedDocument);
    });

    this.connection.onDocumentFormatting((params) => {
      const document = this.getDocument(params.textDocument.uri);
      return this.service.format(document, undefined, params.options);
    });
  }

  async sendDiagnostics(uri: string) {
    const document = this.getDocument(uri);
    const stylesheet = this.getParsedDocument(document);
    this.connection.sendDiagnostics({
      uri: uri,
      version: document.version,
      diagnostics: await this.service.doValidation(document, stylesheet),
    });
  }

  getDocument(uri: string) {
    const document = this.documents.get(uri);
    if (!document) {
      throw new Error(`Document with uri "${uri}" not found`);
    }

    return document;
  }

  getParsedDocument(document: TextDocument) {
    const cachedParsedDocument = this.cachedParsedDocuments.get(document.uri);
    if (cachedParsedDocument?.version === document.version) {
      return cachedParsedDocument.parsedDocument;
    } else {
      const parsedDocument = this.service.parseJSONDocument(document);
      this.cachedParsedDocuments.set(document.uri, {
        version: document.version,
        parsedDocument: parsedDocument,
      });

      return parsedDocument;
    }
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

new JsonLsp(reader, writer);
self.postMessage({ type: "server-ready" } as ServerReadyMessage);
