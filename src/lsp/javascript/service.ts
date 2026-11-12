import {
  DiagnosticSeverity,
  DiagnosticTag,
  Hover,
  Position,
  Range,
  type Diagnostic,
  CompletionItemKind,
  type CompletionItem,
  type CompletionList,
  type SignatureHelpContext,
  type SignatureHelp,
  MarkupContent,
  FormattingOptions,
  TextEdit,
} from "vscode-languageserver";
import type { TextDocument } from "vscode-languageserver-textdocument";
import ts from "typescript";

export default class JavascriptLanguageService {
  service: ts.LanguageService;
  constructor(typescriptService: ts.LanguageService) {
    this.service = typescriptService;
  }

  doValidation(document: TextDocument): Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [
      ...this.service.getSyntacticDiagnostics(document.uri),
      ...this.service.getSuggestionDiagnostics(document.uri),
      ...this.service.getSemanticDiagnostics(document.uri),
    ];

    return diagnostics.map((diagnostic) =>
      tsDiagnosticToLspDiagnostic(document, diagnostic),
    );
  }

  doHover(
    document: TextDocument,
    position: Position,
  ): Hover | null | undefined {
    const offset = document.offsetAt(position);
    const info = this.service.getQuickInfoAtPosition(document.uri, offset);
    if (!info) return null;
    const signature = ts.displayPartsToString(info.displayParts);
    const documentation = ts.displayPartsToString(info.documentation);
    const tags = info.tags?.map(jsDocTag).join("\n\n") ?? "";
    return {
      range: rangeFromSpan(document, info.textSpan),
      contents: [
        {
          language: "javascript",
          value: signature,
        },
        [documentation, tags].filter(Boolean).join("\n\n"),
      ],
    };
  }

  doComplete(
    document: TextDocument,
    position: Position,
  ): CompletionList | CompletionItem[] | null | undefined {
    const offset = document.offsetAt(position);
    const result = this.service.getCompletionsAtPosition(document.uri, offset, {
      allowIncompleteCompletions: true,
      includeCompletionsWithInsertText: true,
      includeAutomaticOptionalChainCompletions: true,
      includeCompletionsWithClassMemberSnippets: true,
      includeCompletionsWithObjectLiteralMethodSnippets: true,
      includeCompletionsWithSnippetText: true,
    });
    if (!result) return { isIncomplete: false, items: [] };
    return {
      isIncomplete: !!result.isIncomplete,
      items: result.entries
        .filter((entry) => entry.name)
        .map((entry): CompletionItem => {
          const item: CompletionItem = {
            label: entry.name,
            kind: completionKind(entry.kind),
            sortText: entry.sortText,
            filterText: entry.filterText,
            insertText: entry.insertText ?? entry.name,
            commitCharacters:
              entry.commitCharacters ?? result.defaultCommitCharacters,
            data: {
              uri: document.uri,
              offset,
              name: entry.name,
              source: entry.source,
              entryData: entry.data,
            },
          };
          if (entry.replacementSpan) {
            item.textEdit = {
              range: rangeFromSpan(document, entry.replacementSpan),
              newText: entry.insertText ?? entry.name,
            };
          }
          return item;
        }),
    };
  }

  signatureHelp(
    document: TextDocument,
    position: Position,
    context?: SignatureHelpContext,
  ): SignatureHelp | null {
    const offset = document.offsetAt(position);
    const items = this.service.getSignatureHelpItems(document.uri, offset, {
      triggerReason: signatureTrigger(context),
    });
    if (!items) return null;
    return {
      activeSignature: items.selectedItemIndex,
      activeParameter: items.argumentIndex,
      signatures: items.items.map((item) => ({
        label:
          ts.displayPartsToString(item.prefixDisplayParts) +
          item.parameters
            .map((parameter) => ts.displayPartsToString(parameter.displayParts))
            .join(ts.displayPartsToString(item.separatorDisplayParts)) +
          ts.displayPartsToString(item.suffixDisplayParts),
        documentation: markdownContent(
          ts.displayPartsToString(item.documentation),
        ),
        parameters: item.parameters.map((parameter) => ({
          label: ts.displayPartsToString(parameter.displayParts),
          documentation: markdownContent(
            ts.displayPartsToString(parameter.documentation),
          ),
        })),
      })),
    };
  }

  format(document: TextDocument, options?: FormattingOptions): TextEdit[] {
    const settings = formatSettings(options);
    const edits = this.service.getFormattingEditsForDocument(
      document.uri,
      settings,
    );
    return edits.map((edit) => ({
      range: rangeFromSpan(document, edit.span),
      newText: edit.newText,
    }));
  }
}

function tsDiagnosticToLspDiagnostic(
  document: TextDocument,
  diagnostic: ts.Diagnostic,
): Diagnostic {
  const tags: DiagnosticTag[] = [];
  if (diagnostic.reportsUnnecessary) tags.push(DiagnosticTag.Unnecessary);
  if (diagnostic.reportsDeprecated) tags.push(DiagnosticTag.Deprecated);
  return {
    range: rangeFromSpan(document, diagnostic),
    code: diagnostic.code,
    severity: diagnosticSeverity(diagnostic.category),
    message: ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
    source: diagnostic.source ?? "typescript",
    tags,
  };
}

function rangeFromSpan(
  document: TextDocument,
  span: { start?: number; length?: number },
): Range {
  const startOffset = span.start ?? 0;
  return Range.create(
    document.positionAt(startOffset),
    document.positionAt(startOffset + (span.length ?? 0)),
  );
}

function jsDocTag(tag: ts.JSDocTagInfo): string {
  const text = Array.isArray(tag.text)
    ? tag.text.map((part) => part.text).join("")
    : (tag.text ?? "");
  return `*@${tag.name}*${text ? ` — ${text}` : ""}`;
}

function markdownContent(value: string): MarkupContent | undefined {
  return value ? { kind: "markdown", value } : undefined;
}

function signatureTrigger(
  context?: SignatureHelpContext,
): ts.SignatureHelpTriggerReason {
  if (context?.triggerKind === 2 && context.triggerCharacter) {
    return context.isRetrigger
      ? {
          kind: "retrigger",
          triggerCharacter:
            context.triggerCharacter as ts.SignatureHelpTriggerCharacter,
        }
      : {
          kind: "characterTyped",
          triggerCharacter:
            context.triggerCharacter as ts.SignatureHelpTriggerCharacter,
        };
  }
  return context?.isRetrigger ? { kind: "retrigger" } : { kind: "invoked" };
}

function formatSettings(
  options?: FormattingOptions | null,
): ts.FormatCodeSettings {
  const tabSize = options?.tabSize ?? 2;
  const insertSpaces = options?.insertSpaces ?? true;
  return {
    tabSize,
    indentSize: tabSize,
    convertTabsToSpaces: insertSpaces,
    trimTrailingWhitespace: options?.trimTrailingWhitespace,
    insertSpaceAfterCommaDelimiter: insertSpaces,
    insertSpaceAfterSemicolonInForStatements: insertSpaces,
    insertSpaceBeforeAndAfterBinaryOperators: insertSpaces,
    insertSpaceAfterKeywordsInControlFlowStatements: insertSpaces,
    insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: insertSpaces,
  };
}

function diagnosticSeverity(
  category: ts.DiagnosticCategory,
): DiagnosticSeverity {
  switch (category) {
    case ts.DiagnosticCategory.Error:
      return DiagnosticSeverity.Error;
    case ts.DiagnosticCategory.Warning:
      return DiagnosticSeverity.Warning;
    case ts.DiagnosticCategory.Suggestion:
      return DiagnosticSeverity.Hint;
    default:
      return DiagnosticSeverity.Information;
  }
}

function completionKind(kind: ts.ScriptElementKind): CompletionItemKind {
  switch (kind) {
    case ts.ScriptElementKind.primitiveType:
    case ts.ScriptElementKind.keyword:
      return CompletionItemKind.Keyword;
    case ts.ScriptElementKind.constElement:
    case ts.ScriptElementKind.letElement:
    case ts.ScriptElementKind.variableElement:
    case ts.ScriptElementKind.localVariableElement:
    case ts.ScriptElementKind.alias:
    case ts.ScriptElementKind.parameterElement:
      return CompletionItemKind.Variable;
    case ts.ScriptElementKind.memberVariableElement:
    case ts.ScriptElementKind.memberGetAccessorElement:
    case ts.ScriptElementKind.memberSetAccessorElement:
      return CompletionItemKind.Field;
    case ts.ScriptElementKind.functionElement:
    case ts.ScriptElementKind.localFunctionElement:
      return CompletionItemKind.Function;
    case ts.ScriptElementKind.memberFunctionElement:
    case ts.ScriptElementKind.constructSignatureElement:
    case ts.ScriptElementKind.callSignatureElement:
    case ts.ScriptElementKind.indexSignatureElement:
      return CompletionItemKind.Method;
    case ts.ScriptElementKind.enumElement:
      return CompletionItemKind.Enum;
    case ts.ScriptElementKind.enumMemberElement:
      return CompletionItemKind.EnumMember;
    case ts.ScriptElementKind.moduleElement:
    case ts.ScriptElementKind.externalModuleName:
      return CompletionItemKind.Module;
    case ts.ScriptElementKind.classElement:
    case ts.ScriptElementKind.typeElement:
      return CompletionItemKind.Class;
    case ts.ScriptElementKind.interfaceElement:
      return CompletionItemKind.Interface;
    case ts.ScriptElementKind.scriptElement:
      return CompletionItemKind.File;
    case ts.ScriptElementKind.directory:
      return CompletionItemKind.Folder;
    default:
      return CompletionItemKind.Property;
  }
}
