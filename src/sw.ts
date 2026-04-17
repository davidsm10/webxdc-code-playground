import { appAssetsDB } from "./dbs";
import { lookup } from "mrmime";
import type { FileResponse } from "./components/Preview/types";

declare let self: ServiceWorkerGlobalScope;

//@ts-ignore
const precacheManifest = self.__WB_MANIFEST as {
  url: string;
  revision: string | null;
}[];
const extraAssets = [
  "/icon.svg",
  "/favicon.ico",
  "/apple-touch-icon-180x180.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async function () {
      await self.skipWaiting();
      await saveAppAssets();
      saveExtraAssets();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async function () {
      await self.clients.claim();
      await deleteOldAssets();
    })(),
  );
});

const pendingRemoteFileRequests: {
  [path: string]: {
    resolve: (value: string | Uint8Array<ArrayBuffer>) => void;
    reject: (reason?: any) => void;
  };
} = {};
self.addEventListener("message", (event) => {
  const data: FileResponse = event.data;
  if (data.type === "file-response") {
    if (data.content) {
      pendingRemoteFileRequests[data.path].resolve(data.content);
    } else if (data.error) {
      pendingRemoteFileRequests[data.path].reject(data.error);
    }
  }
});

self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).origin !== location.origin) return;
  event.respondWith(getResponse(event));
});

async function saveAppAssets() {
  const savedAssetsPaths = await appAssetsDB.keys();
  const fetchAndSaveAsset = async (path: string, revision: string | null) => {
    const assetData = await (await fetch(path)).blob();
    await appAssetsDB.setItem(path, { revision, data: assetData });
  };
  for (const { url, revision } of precacheManifest) {
    let path = "/" + url;
    if (savedAssetsPaths.includes(url)) {
      const asset = await appAssetsDB.getItem<{
        revision: string | null;
        data: Blob;
      }>(path);
      if (asset!.revision !== revision) {
        await fetchAndSaveAsset(path, revision);
      }
    } else {
      await fetchAndSaveAsset(path, revision);
    }
  }
}

async function saveExtraAssets() {
  for (const path of extraAssets) {
    const file = await (await fetch(path)).blob();
    await appAssetsDB.setItem(path, { data: file });
  }
}

async function deleteOldAssets() {
  const savedAssetsPaths = await appAssetsDB.keys();
  const precacheManifestPaths = precacheManifest.map(({ url }) => "/" + url);
  for (const path of savedAssetsPaths) {
    if (!precacheManifestPaths.includes(path) && !extraAssets.includes(path)) {
      await appAssetsDB.removeItem(path);
    }
  }
}

async function getResponse(event: FetchEvent) {
  if (event.request.destination === "document") {
    return getAppResponse(event);
  } else if (event.request.destination === "iframe") {
    return getPreviewResponse(event);
  }
  const client = await self.clients.get(event.clientId);
  if (client && client.frameType === "top-level") {
    return getAppResponse(event);
  } else {
    return getPreviewResponse(event);
  }
}

async function getAppResponse(event: FetchEvent) {
  let path = new URL(event.request.url).pathname;
  if (path.endsWith("/")) path += "index.html";
  const savedAsset = await appAssetsDB.getItem<{
    revision: string | null;
    data: Blob;
  }>(path);
  if (savedAsset) {
    return new Response(savedAsset.data, {
      headers: {
        "Content-Type": lookup(path) || "application/octet-stream",
        "Content-Length": String(savedAsset.data.size),
        "Cache-Control": "no-store",
      },
    });
  }
  return fetch(event.request);
}

async function requestRemoteFileContent(path: string) {
  const fileContentPromise: Promise<Uint8Array<ArrayBuffer> | string> =
    new Promise((resolve, reject) => {
      pendingRemoteFileRequests[path] = { resolve, reject };
    });
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) {
    if (client.frameType === "top-level") {
      client.postMessage({ type: "file-request", path: path });
    }
  }
  return fileContentPromise;
}

async function getPreviewResponse(event: FetchEvent) {
  let path = new URL(event.request.url).pathname;
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
