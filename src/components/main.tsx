import classes from "./main.module.css";
import Tabs, { type ExposedTabActions } from "./tabs/tabs";
import Editor from "./editor";
import FileManager, {
  type Node,
  getFolderZip,
} from "./fileManager/fileManager";
import Preview, { type FileRequest, type FileResponse } from "./preview";
import { ArrowLeftIcon, FilesIcon, PlayIcon, Share2Icon } from "lucide-react";
import { generalDB, setupZenFSDB, persistStorage } from "../storage";
import { exportFile } from "../util";
import { readFile, writeFile } from "@zenfs/core/promises";
import * as webTemplate from "../web-template";
import * as webxdcTemplate from "../webxdc-template";
import eruda from "eruda?raw";
import { useEffect, useRef, useState } from "react";
import { isAbsolute, relative, resolve } from "@zenfs/core/path.js";
import type { EditorView } from "codemirror";

export default function Main() {
  const [setupDone, setSetupDone] = useState(false);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [tabs, setTabs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const tabsComponent = useRef<ExposedTabActions>(null);
  const editors = useRef<{ [path: string]: EditorView }>({});

  function toggleFileManager() {
    setShowFileManager(!showFileManager);
  }

  function onFSNodeDeleted(node: Node) {
    tabs!.forEach((tab) => {
      if (tab === node.path) tabsComponent.current!.closeTab(tab);
      else {
        const relativePath = relative(node.path, tab);
        if (
          relativePath &&
          !relativePath.startsWith("..") &&
          !isAbsolute(relativePath)
        ) {
          tabsComponent.current!.closeTab(tab);
        }
      }
    });
  }

  function onFSNodeRenamed(from: Node, to: Node) {
    tabs!.forEach((tab) => {
      if (tab === from.path)
        tabsComponent.current!.replaceTab(from.path, to.path);
      else {
        const relativePath = relative(from.path, tab);
        if (
          relativePath &&
          !relativePath.startsWith("..") &&
          !isAbsolute(relativePath)
        ) {
          const finalPath = resolve(to.path, relativePath);
          tabsComponent.current!.replaceTab(tab, finalPath);
        }
      }
    });
  }

  function onFSFileNodeClick(node: Node) {
    tabsComponent.current!.addTab(node.path);
    tabsComponent.current!.setActiveTab(node.path);
  }

  async function onActiveTabChange(tab: string | null) {
    setActiveTab(tab);
    await generalDB.setItem("activeTab", tab);
  }

  async function onTabsChange(tabs: string[]) {
    setTabs(tabs);
    await generalDB.setItem("tabs", tabs);
  }

  function openPreview() {
    let previewTab;
    if (activeTab?.endsWith(".html")) {
      previewTab = "preview:" + activeTab;
    } else {
      previewTab = "preview:" + "/index.html";
    }
    tabsComponent.current!.addTab(previewTab);
    tabsComponent.current!.setActiveTab(previewTab);
  }

  useEffect(() => {
    const initialSetup = async () => {
      await setupZenFSDB();
      await setupTemplate();
      setSetupDone(true);
      persistStorage();
    };

    const setupServiceWorker = async () => {
      await navigator.serviceWorker?.ready;
      navigator.serviceWorker.addEventListener(
        "message",
        onServiceWorkerMessage,
      );
      setServiceWorkerReady(true);
    };

    initialSetup();
    setupServiceWorker();
  }, []);

  useEffect(() => {
    if (activeTab) {
      if (editors.current[activeTab]) editors.current[activeTab].focus();
    }
  }, [activeTab]);

  return (
    <>
      {setupDone && (
        <div className={classes.container}>
          <div className={classes.sideBar} hidden={!showFileManager}>
            <FileManager
              onDeleted={onFSNodeDeleted}
              onRenamed={onFSNodeRenamed}
              onFileNodeClick={onFSFileNodeClick}
            />
          </div>
          <div className={classes.main}>
            <div className={classes.header}>
              <div className={classes.panelLeft}>
                <button
                  className={classes.button}
                  onClick={toggleFileManager}
                  title="Files"
                >
                  {showFileManager ? (
                    <ArrowLeftIcon />
                  ) : (
                    <FilesIcon size="20" />
                  )}
                </button>
              </div>
              <Tabs
                ref={tabsComponent}
                onActiveTabChange={onActiveTabChange}
                onTabsChange={onTabsChange}
              />
              <div className={classes.panelRight}>
                {serviceWorkerReady && !activeTab?.startsWith("preview:") && (
                  <button
                    className={classes.button}
                    aria-label="Open preview"
                    title="Open preview"
                    onClick={openPreview}
                  >
                    <PlayIcon size="20" />
                  </button>
                )}
                {window.webxdc && (
                  <button
                    className={classes.button}
                    onClick={exportApp}
                    aria-label="Export app"
                    title="Export app"
                  >
                    <Share2Icon size="20px" />
                  </button>
                )}
              </div>
            </div>

            <div className={classes.content}>
              {tabs?.map((tab) => (
                <div
                  key={tab}
                  hidden={tab !== activeTab}
                  style={{ height: "100%" }}
                >
                  {tab.startsWith("preview:") ? (
                    <>
                      {activeTab === tab && (
                        <Preview entryPath={tab.replace("preview:", "")} />
                      )}
                    </>
                  ) : (
                    <Editor
                      path={tab}
                      onMount={(editorView) =>
                        (editors.current[tab] = editorView)
                      }
                      onDestroy={() => delete editors.current[tab]}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

async function onServiceWorkerMessage(event: MessageEvent<FileRequest>) {
  if (event.data.type !== "file-request") return;
  let response: FileResponse = {
    type: "file-response",
    path: event.data.path,
  };
  try {
    if (event.data.path.endsWith(".html")) {
      const textContent = await readFile(event.data.path, {
        encoding: "utf-8",
      });
      const doc = new DOMParser().parseFromString(textContent, "text/html");
      const erudaScript = doc.createElement("script");
      erudaScript.src = "/___injected_eruda.js";
      doc.head.prepend(erudaScript);
      if (window.webxdc) {
        const scripts = doc.querySelectorAll("script");
        scripts.forEach((script) => {
          if (script.src && new URL(script.src).pathname === "/webxdc.js") {
            script.removeAttribute("src");
            script.textContent = "window.webxdc = window.parent.webxdc";
          }
        });
      }
      response.content = "<!doctype html>\n" + doc.documentElement.outerHTML;
    } else if (event.data.path === "/___injected_eruda.js") {
      response.content = eruda + "\neruda.init()";
    } else {
      response.content = (await readFile(
        event.data.path,
      )) as Uint8Array<ArrayBuffer>;
    }
  } catch (err) {
    response.error = err;
  } finally {
    event.source?.postMessage(response);
  }
}

async function exportApp() {
  const appZip = await getFolderZip("/");
  await exportFile(appZip, "app.xdc");
}

async function setupTemplate() {
  if (!(await generalDB.getItem("templateSet"))) {
    const template = window.webxdc ? webxdcTemplate : webTemplate;
    for (const [path, content] of template.files) {
      await writeFile(path, content);
    }

    await generalDB.setItem("tabs", template.tabs);
    await generalDB.setItem("activeTab", "/index.html");
    await generalDB.setItem("templateSet", true);
  }
}
