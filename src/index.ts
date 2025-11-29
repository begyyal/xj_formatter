import { window, languages, ExtensionContext, TextEdit, TextDocument, FormattingOptions } from 'vscode';
import { parse } from "java-parser";
import { NodeProcessor } from './prcs/node-processor';

export const s_out = window.createOutputChannel("xj-formatter");
export function activate(_context: ExtensionContext) {
    languages.registerDocumentFormattingEditProvider('java', {
        async provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions): Promise<TextEdit[]> {
            try {
                const node = parse(document.getText());
                return new NodeProcessor(options).exe(document, node);
            } catch (e) {
                s_out.appendLine("something went wrong.");
                s_out.appendLine(e instanceof Error && e.stack ? e.stack : e);
            }
            return [];
        }
    });
}