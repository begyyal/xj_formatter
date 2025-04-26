import { CstNode, IToken } from "java-parser";
import { int2array, UType } from "xjs-common";
import { AsyncLocalStorage } from "async_hooks";
import { FormattingOptions, TextDocument, TextEdit, TextLine } from "vscode";

export class NodeProcessor {
    private readonly _als = new AsyncLocalStorage<{ document: TextDocument, depth: number }>();
    private readonly _edits: TextEdit[] = [];
    private readonly _row2elms: Record<number, { depth: number, elms: { elm: IToken, t: string }[] }> = {};
    private readonly _indentUnit = this._options.insertSpaces ? int2array(this._options.tabSize).map(_ => " ").join("") : "\t";
    constructor(private readonly _options: FormattingOptions) { }
    exe(document: TextDocument, n: CstNode): TextEdit[] {
        this._als.run({ document, depth: 0 }, () => this.exeIn(n));
        Object.entries(this._row2elms).forEach(e =>
            this.scanTextLine(document.lineAt(Number(e[0])), e[1].elms, e[1].depth));
        return this._edits;
    }
    private exeIn(n: CstNode): void {
        for (const e of Object.entries(n.children)) {
            const type = e[0];
            const doIndent = [
                "classBodyDeclaration",
                "blockStatements"
            ].includes(type);
            if (doIndent) this._als.getStore().depth++;
            for (const a of e[1]) {
                if (isNode(a)) this.exeIn(a);
                else if (a.image) {
                    const rowIdx = a.startLine - 1;
                    this._row2elms[rowIdx] ??= { depth: this._als.getStore().depth, elms: [] };
                    this._row2elms[rowIdx].elms.push({ elm: a, t: type });
                }
            }
            if (doIndent) this._als.getStore().depth--;
        }
    }
    private scanTextLine(textLine: TextLine, elms: { elm: IToken, t: string }[], depth: number): void {
        elms.sort((a, b) => a.elm.startOffset - b.elm.startOffset);
        let text = this.generateIndent(depth), before: { elm: IToken, t: string } = null;
        for (const elm of elms) {
            if (before) if (
                !["Semicolon", "Dot", "LBrace", "RBrace"].includes(elm.t) &&
                !["Dot", "LBrace"].includes(before.t) ||
                ["If", "For", "While"].includes(before.t))
                text += " ";
            text += elm.elm.image;
            before = elm;
        }
        this._edits.push(TextEdit.replace(textLine.range, text));
    }
    private generateIndent(d: number): string {
        return int2array(d).map(_ => this._indentUnit).join("");
    }
}
function isNode(v: any): v is CstNode {
    return UType.isDefined(v["location"]);
}
