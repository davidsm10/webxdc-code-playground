import classes from "./tabs.module.css";
import { XIcon, PlayIcon } from "lucide-react";
import { basename } from "@zenfs/core/path";
import { useEffect, useImperativeHandle, useState, type Ref } from "react";
import { generalDB } from "../../storage";

export interface ExposedTabActions {
  setActiveTab: (tab: string | null) => void;
  addTab: (tab: string) => void;
  closeTab: (tab: string) => void;
  replaceTab: (from: string, to: string) => void;
}

export default function Tabs(props: {
  ref: Ref<ExposedTabActions>;
  onActiveTabChange?: (activeTab: string | null) => void;
  onTabsChange?: (tabs: string[]) => void;
}) {
  const [tabs, setTabs] = useState<string[]>();
  const [activeTab, setActiveTab] = useState<string | null>();

  useImperativeHandle(
    props.ref,
    () => {
      return {
        setActiveTab: setActiveTab,
        addTab: addTab,
        closeTab: closeTab,
        replaceTab: replaceTab,
      };
    },
    [tabs, activeTab],
  );

  function addTab(tab: string) {
    if (!tabs?.includes(tab)) {
      setTabs([...tabs!, tab]);
    }
  }

  function closeTab(tab: string) {
    if (tabs?.includes(tab)) {
      if (tab === activeTab) {
        if (tabs.length > 1) {
          const activeTabIndex = tabs.indexOf(tab);
          setActiveTab(tabs[activeTabIndex + 1] || tabs[activeTabIndex - 1]);
        } else {
          setActiveTab(null);
        }
      }
      setTabs(tabs.filter((val) => val !== tab));
    }
  }

  function replaceTab(from: string, to: string) {
    if (tabs?.includes(from)) {
      tabs[tabs.indexOf(from)] = to;
      setTabs([...tabs]);
      if (activeTab === from) {
        setActiveTab(to);
      }
    }
  }

  function onTabKeydown(e: React.KeyboardEvent<HTMLDivElement>, tab: string) {
    if (e.key === "Enter" || e.key === " ") {
      setActiveTab(tab);
    }
  }

  useEffect(() => {
    if (activeTab !== undefined) props.onActiveTabChange?.(activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (tabs !== undefined) props.onTabsChange?.(tabs);
  }, [tabs]);

  useEffect(() => {
    const initialSetup = async () => {
      const savedTabs = await generalDB.getItem<string[]>("tabs");
      const savedActiveTab = await generalDB.getItem<string>("activeTab");
      if (savedTabs) setTabs(savedTabs);
      if (savedActiveTab) setActiveTab(savedActiveTab);
    };

    initialSetup();
  }, []);

  return (
    <div className={classes.tabs}>
      {tabs?.map((tab) => (
        <div
          key={tab}
          className={`${classes.tab} ${tab === activeTab ? classes.active : ""} no-select`}
          role="button"
          tabIndex={0}
          onClick={() => setActiveTab(tab)}
          onKeyDown={(e) => onTabKeydown(e, tab)}
        >
          {tab.startsWith("preview:") && <PlayIcon size="20" />}
          <small>{basename(tab)}</small>
          {activeTab === tab && (
            <button
              aria-label="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab);
              }}
            >
              <XIcon size="20" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
