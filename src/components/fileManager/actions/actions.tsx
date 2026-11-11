import classes from "./actions.module.css";
import { useEffect, useRef, useState } from "react";
import { exportNodeAsFile, isValidName } from "../fileManager";
import { dirname, resolve } from "@zenfs/core/path.js";
import type { Events, Node } from "../fileManager";
import {
  exists,
  mkdir,
  rename,
  rm,
  unlink,
  writeFile,
} from "@zenfs/core/promises";
import { copyText, importFiles } from "../../../util";
import {
  CaseSensitiveIcon,
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  FilePlusIcon,
  FolderPlusIcon,
  ImportIcon,
  TrashIcon,
} from "lucide-react";

export default function Actions(props: {
  node: Node;
  events: Events;
  onClose: () => void;
  reloadCurrentFolder: () => void;
  reloadParentFolder: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [nodeAction, setNodeAction] = useState<
    "newfile" | "newdir" | "rename" | null
  >(null);
  const nameInput = useRef<HTMLInputElement>(null);

  async function createNode() {
    const name = nameInput.current!.value;
    let type: "file" | "dir" = "file";
    if (nodeAction === "newdir") {
      type = "dir";
    }
    try {
      if (!isValidName(name)) {
        throw new Error("Invalid name");
      }
      const path = resolve(props.node.path, name);
      if (await exists(path)) {
        throw new Error("File already exists");
      }
      if (type === "dir") {
        await mkdir(path);
      } else {
        await writeFile(path, "");
      }
      props.reloadCurrentFolder();
      if (props.events.onCreated) {
        props.events.onCreated({ type, name, path });
      }
      props.onClose();
    } catch (err) {
      console.log(err);
    }
  }

  async function _importFiles() {
    try {
      const files = await importFiles({ multiple: true });
      for (const file of files) {
        const path = resolve(props.node.path, file.name);
        if (await exists(path)) {
          continue;
        }
        await writeFile(path, new Uint8Array(await file.arrayBuffer()));
        props.reloadCurrentFolder();
        if (props.events.onCreated) {
          props.events.onCreated({ type: "file", name: file.name, path });
        }
      }

      props.onClose();
    } catch (err) {
      console.log(err);
    }
  }

  async function deleteNode() {
    try {
      if (props.node.type === "file") {
        await unlink(props.node.path);
      } else {
        await rm(props.node.path, { recursive: true, force: true });
      }
      props.reloadParentFolder();
      if (props.events.onDeleted) {
        props.events.onDeleted(props.node);
      }
      props.onClose();
    } catch (err) {
      console.log(err);
    }
  }

  async function renameNode() {
    const name = nameInput.current!.value;
    try {
      if (!isValidName(name)) {
        throw new Error("Invalid name");
      }
      const path = resolve(dirname(props.node.path), name);
      if (await exists(path)) {
        throw new Error("File already exists");
      }

      await rename(props.node.path, path);
      props.reloadParentFolder();
      if (props.events.onRenamed) {
        props.events.onRenamed(props.node, {
          type: props.node.type,
          name,
          path,
        });
      }
      props.onClose();
    } catch (err) {
      console.log(err);
    }
  }

  function copyPath() {
    copyText(props.node.path);
    props.onClose();
  }

  async function showNameForm(type: "newfile" | "newdir" | "rename") {
    setNodeAction(type);
  }

  function onBlur() {
    setTimeout(() => {
      if (!container.current!.contains(document.activeElement)) {
        props.onClose();
      }
    }, 0);
  }

  useEffect(() => {
    container.current?.focus();
  }, []);

  useEffect(() => {
    nameInput.current?.focus();
  }, [nodeAction]);

  return (
    <div
      className={classes.container}
      onBlur={onBlur}
      ref={container}
      tabIndex={-1}
    >
      {nodeAction ? (
        <form
          className={classes.newNodeForm}
          onSubmit={(e) => {
            e.preventDefault();
            if (nodeAction === "rename") {
              renameNode();
            } else {
              createNode();
            }
          }}
        >
          <input
            defaultValue={nodeAction === "rename" ? props.node.name : ""}
            type="text"
            placeholder="Name"
            ref={nameInput}
            required
            autoCapitalize="off"
            autoCorrect="off"
          />
          <button>
            <CheckIcon size="20" />
          </button>
        </form>
      ) : (
        <div className={classes.actions}>
          {props.node.type === "dir" && (
            <>
              <button onClick={() => showNameForm("newdir")}>
                <FolderPlusIcon size="20" />
                New folder
              </button>

              <button onClick={() => showNameForm("newfile")}>
                <FilePlusIcon size="20" />
                New file
              </button>

              <button onClick={_importFiles}>
                <ImportIcon size="20" />
                Import files
              </button>
            </>
          )}
          <button onClick={copyPath}>
            <CopyIcon size="20" />
            Copy path
          </button>
          <button onClick={() => exportNodeAsFile(props.node)}>
            <DownloadIcon size="20" />
            Export
          </button>
          {props.node.path !== "/" && (
            <>
              <button onClick={() => showNameForm("rename")}>
                <CaseSensitiveIcon size="20" />
                Rename
              </button>
              <button onClick={deleteNode}>
                <TrashIcon size="20" />
                Delete
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
