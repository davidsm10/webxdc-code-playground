import { lookup } from "mrmime";
import type { FileResponse } from "./components/Preview/types";

declare let self: ServiceWorkerGlobalScope;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());

self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).origin !== location.origin) return;
  if (event.request.destination === "document") return;
  event.respondWith(getResponse(event));
});

async function getResponse(event: FetchEvent) {
  if (event.request.destination === "iframe") {
    return getPreviewResponse(event.request);
  }
  const client = await self.clients.get(event.clientId);
  if (client && client.frameType === "top-level") {
    return fetch(event.request);
  } else {
    return getPreviewResponse(event.request);
  }
}

async function getPreviewResponse(request: Request) {
  let path = new URL(request.url).pathname;
  if (path.endsWith("/")) path += "index.html";
  try {
    const file = await requestRemoteFileContent(path);
    return new Response(file, {
      headers: {
        "Content-Type": lookup(path) || "application/octet-stream",
        "Content-Length": String(file.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const body = String(err);
    return new Response(body, {
      status: 404,
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": String(body.length),
        "Cache-Control": "no-store",
      },
    });
  }
}

async function requestRemoteFileContent(path: string) {
  const fileContentPromise: Promise<Uint8Array<ArrayBuffer> | string> =
    new Promise((resolve, reject) => {
      self.addEventListener("message", (event) => {
        const data: FileResponse = event.data;
        if (data.type === "file-response" && data.path === path) {
          if (data.content) {
            resolve(data.content);
          } else if (data.error) {
            reject(data.error);
          }
        }
      });
    });
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    if (client.frameType === "top-level") {
      client.postMessage({
        type: "file-request",
        path: path,
      });
    }
  }
  return fileContentPromise;
}
