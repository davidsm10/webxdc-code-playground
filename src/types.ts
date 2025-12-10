export interface Tab {
  name: string;
}

export interface OpenTabs {
  [id: string]: Tab;
}
