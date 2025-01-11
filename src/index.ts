import { languages, ExtensionContext, TextEdit, TextDocument, Range } from 'vscode';
import { parse } from "java-parser";

export function activate(context: ExtensionContext) {
    languages.registerDocumentFormattingEditProvider('java', {
        provideDocumentFormattingEdits(document: TextDocument): TextEdit[] {
            // const firstLine = document.lineAt(0);
            // if (firstLine.text !== '42') {
            //     return [TextEdit.insert(firstLine.range.start, '42\n')];
            // }
            const node = parse(document.getText());
            Object.entries(node.children);
            const endLine = document.lineAt(document.lineCount - 1);

            return [TextEdit.delete(endLine.range), TextEdit.insert(endLine.range.start, "aaaaa")];
        }
    });
}


