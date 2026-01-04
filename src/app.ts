import localforage from "localforage";

export const generalDB = localforage.createInstance({
  name: "code-playground-general-database",
});
