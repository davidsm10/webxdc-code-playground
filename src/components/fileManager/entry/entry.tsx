import classes from "./entry.module.css";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  FileIcon,
} from "lucide-react";
import type { Events, Node } from "../fileManager";
import { useEffect, useState } from "react";
import { getDirectoryNodes, sortNodes } from "../fileManager";
import Actions from "../actions/actions";
import { autoUpdate, useFloating } from "@floating-ui/react";

export default function Entry(props: {
  node: Node;
  reloadParentFolder: () => void;
  events: Events;
}) {
  const [open, setOpen] = useState(true);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [children, setChildren] = useState<Node[] | null>(null);
  const { refs, floatingStyles } = useFloating({
    placement: "left-start",
    whileElementsMounted: autoUpdate,
  });

  const depth =
    props.node.path === "/" ? 0 : props.node.path.split("/").length - 1;

  async function setFolderChildren() {
    const children = (await getDirectoryNodes(props.node.path)).sort(sortNodes);
    setChildren(children);
  }

  async function onClick() {
    if (props.node.type === "dir") {
      setOpen(!open);
    } else {
      props.events.onFileNodeClick?.({ ...props.node });
    }
  }

  async function onShowActionsClick() {
    setActionsOpen(true);
  }

  function onCloseActions() {
    setActionsOpen(false);
  }

  useEffect(() => {
    if (props.node.type === "dir") setFolderChildren();
  }, []);

  return (
    <>
      <div className={classes.entry}>
        <button
          className={classes.name}
          onClick={onClick}
          style={{ paddingLeft: `${depth * 10}px` }}
        >
          {props.node.type === "file" ? (
            <FileIcon size="20" />
          ) : (
            <>
              {open ? (
                <ChevronDownIcon size="20" />
              ) : (
                <ChevronRightIcon size="20" />
              )}
            </>
          )}
          {props.node.name}
        </button>
        <button onClick={onShowActionsClick} ref={refs.setReference}>
          <EllipsisVerticalIcon size="20" />
        </button>
      </div>
      {props.node.type === "dir" && (
        <div hidden={!open} style={{ width: "100%" }}>
          {children?.map((node) => (
            <Entry
              key={node.path}
              node={node}
              events={props.events}
              reloadParentFolder={setFolderChildren}
            />
          ))}
        </div>
      )}

      {actionsOpen && (
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          role="menu"
          tabIndex={-1}
        >
          <Actions
            node={props.node}
            onClose={onCloseActions}
            events={props.events}
            reloadParentFolder={props.reloadParentFolder}
            reloadCurrentFolder={setFolderChildren}
          />
        </div>
      )}
    </>
  );
}
