import {
  type LanguageService,
  type Stylesheet,
  getCSSLanguageService,
} from "vscode-css-languageservice";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  type Connection,
  BrowserMessageReader,
  BrowserMessageWriter,
  TextDocumentSyncKind,
  type ServerCapabilities,
} from "vscode-languageserver/browser";

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

export const documentContext = { resolveReference };

export interface CachedParsedDocument {
  version: number;
  parsedDocument: Stylesheet;
}

const capabilities: ServerCapabilities = {
  textDocumentSync: TextDocumentSyncKind.Incremental,
  hoverProvider: true,
  completionProvider: {},
  documentFormattingProvider: true,
};

class CssLsp {
  documents: TextDocuments<TextDocument>;
  connection: Connection;
  service: LanguageService;
  cachedParsedDocuments: Map<string, CachedParsedDocument>;

  constructor() {
    this.documents = new TextDocuments(TextDocument);
    this.service = getCSSLanguageService();
    this.cachedParsedDocuments = new Map();
    const reader = new BrowserMessageReader(self);
    const writer = new BrowserMessageWriter(self);
    this.connection = createConnection(ProposedFeatures.all, reader, writer);
    this.setupListeners();
    this.documents.listen(this.connection);
    this.connection.listen();
  }

  setupListeners(): void {
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

  sendDiagnostics(uri: string) {
    const document = this.getDocument(uri);
    const stylesheet = this.getParsedDocument(document);
    this.connection.sendDiagnostics({
      uri: uri,
      version: document.version,
      diagnostics: this.service.doValidation(document, stylesheet),
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
      const parsedDocument = this.service.parseStylesheet(document);
      this.cachedParsedDocuments.set(document.uri, {
        version: document.version,
        parsedDocument: parsedDocument,
      });

      return parsedDocument;
    }
  }
}

new CssLsp();
