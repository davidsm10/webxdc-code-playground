import { snippets } from "@codemirror/lang-javascript";
import { ifNotIn, completeFromList } from "@codemirror/autocomplete";

const dontComplete = [
  "TemplateString",
  "String",
  "RegExp",
  "LineComment",
  "BlockComment",
  "VariableDefinition",
  "TypeDefinition",
  "Label",
  "PropertyDefinition",
  "PropertyName",
  "PrivatePropertyDefinition",
  "PrivatePropertyName",
  "JSXText",
  "JSXAttributeValue",
  "JSXOpenTag",
  "JSXCloseTag",
  "JSXSelfClosingTag",
  ".",
  "?.",
];

let kwCompletion = (name: string) => ({ label: name, type: "keyword" });
const keywords =
  "break case const continue default delete export extends false finally in instanceof let new return static super switch this throw true typeof var yield"
    .split(" ")
    .map(kwCompletion);
let completions = snippets.concat(keywords);

export const jsCompletions = ifNotIn(
  dontComplete,
  completeFromList(completions),
);
