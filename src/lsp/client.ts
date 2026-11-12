import {
  LSPClient,
  languageServerExtensions,
  type Transport,
} from "@codemirror/lsp-client";
import htmlWorker from "../lsp/html?worker&url";
import cssWorker from "../lsp/css?worker&url";
import jsonWorker from "../lsp/json?worker&url";
import javascriptWorker from "../lsp/javascript/javascript?worker&url";

function getLspTransport(worker: Worker): Transport {
  let handlers: ((message: string) => void)[] = [];
  worker.onmessage = (event) => {
    for (const handler of handlers) {
      handler(JSON.stringify(event.data));
    }
  };
  return {
    send(message) {
      worker.postMessage(JSON.parse(message));
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
