import {
  TextDocuments,
  type Connection,
  createConnection,
  ProposedFeatures,
  type ServerCapabilities,
  TextDocumentSyncKind,
  MessageWriter,
  MessageReader,
} from "vscode-languageserver/browser";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  getLanguageService,
  type HTMLDocument,
  type LanguageService,
} from "vscode-html-languageservice";
import {
  CustomMessageReader,
  CustomMessageWriter,
  type ServerLspMessage,
  type ServerReadyMessage,
} from "./server";
import type { ClientMessage } from "./client";

declare let self: Worker;

function resolveReference(
  reference: string,
  baseUri: string,
): string | undefined {
  try {
    return new URL(reference, baseUri).href;
  } catch {
    return undefined;
  }
}

const documentContext = { resolveReference };

const capabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  completionProvider: {
    resolveProvider: true,
  },
  hoverProvider: true,
  documentFormattingProvider: true,
};

interface CachedParsedDocuments {
  version: number;
  parsedDocument: HTMLDocument;
}

class HtmlLsp {
  documents: TextDocuments<TextDocument>;
  cachedParsedDocuments: Map<string, CachedParsedDocuments>;
  service: LanguageService;
  connection: Connection;

  constructor(reader: MessageReader, writer: MessageWriter) {
    this.documents = new TextDocuments(TextDocument);
    this.cachedParsedDocuments = new Map();
    this.service = getLanguageService();
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

    this.documents.onDidClose((e) => {
      this.cachedParsedDocuments.delete(e.document.uri);
    });

    this.connection.onCompletion((params) => {
      const document = this.getDocument(params.textDocument.uri);
      const parsedDocument = this.getParsedDocument(document);
      return this.service.doComplete2(
        document,
        params.position,
        parsedDocument,
        documentContext,
      );
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

  getDocument(uri: string) {
    const document = this.documents.get(uri);
    if (!document) {
      throw new Error(`Document with uri "${uri}" not found`);
    }

    return document;
  }

  getParsedDocument(document: TextDocument) {
    const cachedStyleSheet = this.cachedParsedDocuments.get(document.uri);
    if (cachedStyleSheet?.version === document.version) {
      return cachedStyleSheet.parsedDocument;
    } else {
      const parsedDocument = this.service.parseHTMLDocument(document);
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

new HtmlLsp(reader, writer);
self.postMessage({ type: "server-ready" } as ServerReadyMessage);
