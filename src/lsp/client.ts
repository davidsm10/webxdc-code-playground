import {
  LSPClient,
  languageServerExtensions,
  type Transport,
} from "@codemirror/lsp-client";
import htmlWorker from "../lsp/html?worker&url";
import cssWorker from "../lsp/css?worker&url";
import jsonWorker from "../lsp/json?worker&url";
import javascriptWorker from "../lsp/javascript/javascript?worker&url";
import type { ServerMessage } from "./server";

export interface ClientLspMessage {
  type: "client-lsp";
  message: string;
}

export type ClientMessage = ClientLspMessage;

function getLspTransport(worker: Worker): Transport {
  let handlers: ((message: string) => void)[] = [];
  worker.onmessage = (event: MessageEvent<ServerMessage>) => {
    if (event.data.type === "server-lsp") {
      for (const handler of handlers) {
        handler(event.data.message);
      }
    }
  };
  return {
    send(message) {
      worker.postMessage({
        type: "client-lsp",
        message: message,
      } as ClientLspMessage);
    },
    subscribe(handler) {
      handlers.push(handler);
    },
    unsubscribe(handler) {
      handlers = handlers.filter((h) => h != handler);
    },
  };
}

function getLspClient(worker: Worker) {
  const transport = getLspTransport(worker);
  const client = new LSPClient({
    extensions: languageServerExtensions(),
  }).connect(transport);

  return client;
}

function loadLspClient(workerPath: string) {
  const worker = new Worker(workerPath, {
    type: "module",
  });
  const client = getLspClient(worker);

  return client;
}

export const lspClients = {
  html: loadLspClient(htmlWorker),
  css: loadLspClient(cssWorker),
  json: loadLspClient(jsonWorker),
  javascript: loadLspClient(javascriptWorker),
};
