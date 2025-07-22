import { CstElement, CstNode, IToken } from "java-parser";
import { int2array, UType } from "xjs-common";
import { AsyncLocalStorage } from "async_hooks";
import { FormattingOptions, TextDocument, TextEdit, TextLine } from "vscode";

interface XjElement {
    token: IToken;
    t: string;
    tAnc: string;
}
export class NodeProcessor {
    private readonly _als = new AsyncLocalStorage<{ document: TextDocument, depth: number }>();
    private readonly _edits: TextEdit[] = [];
    private readonly _row2elms: Record<number, { depth: number, elms: XjElement[] }> = {};
    private readonly _indentUnit = this._options.insertSpaces ? int2array(this._options.tabSize).map(_ => " ").join("") : "\t";
    private readonly _indentPrefixTypes = [
        "classBodyDeclaration",
        "methodDeclarator",
        "blockStatements",
        "argumentList"
    ];
    private readonly _nospaceCheckers: ((b: XjElement, e: XjElement) => boolean)[] = [
        (b, e) => "Dot" === b.t || ["Semicolon", "Dot", "Comma"].includes(e.t),
        (b, e) => "LBrace" === b.t || "RBrace" === e.t,
        (b, e) => !["If", "For", "While", "Switch"].includes(b.t) && "LBrace" === e.t,
        (b, e) => b.tAnc === "typeParameters" && b.t === "Less" || e.tAnc === "typeParameters" && e.t === "Greater",
        (b, e) => b.tAnc === "typeArguments" && b.t === "Less" || e.tAnc === "typeArguments" && e.t === "Greater",
        (_, e) => e.tAnc === "typeArguments" && e.t === "Less",
        (b, _) => "UnaryPrefixOperator" === b.t,
        (b, _) => "At" === b.t,
    ];
    constructor(private readonly _options: FormattingOptions) { }
    exe(document: TextDocument, n: CstNode): TextEdit[] {
        this._als.run({ document, depth: 0 }, () => this.exeIn(n));
        Object.entries(this._row2elms).forEach(e =>
            this.scanTextLine(document.lineAt(Number(e[0])), e[1].elms, e[1].depth));
        return this._edits;
    }
    private exeIn(n: CstNode, tAnc?: string): void {
        for (const e of Object.entries(n.children)) {
            const type = e[0];
            const doIndent = this._indentPrefixTypes.includes(type);
            if (doIndent) this._als.getStore().depth++;
            for (let i = 0; i < e[1].length; i++) {
                const elm = e[1][i];
                if (hasComments(elm)) {
                    const comments = (elm.leadingComments ?? []).concat(elm.trailingComments ?? []);
                    comments.forEach(c => this.collectToken(c, type, tAnc));
                }
                if (isNode(elm)) this.exeIn(elm, type);
                else if (elm.image) {
                    const noIndent = tAnc === "methodDeclarator" && (i === 0 || i === e[1].length - 1);
                    this.collectToken(elm, type, tAnc, noIndent);
                }
            }
            if (doIndent) this._als.getStore().depth--;
        }
    }
    private collectToken(elm: IToken, type: string, tAnc: string, noIndent?: boolean): void {
        // currently the tokens over multiple line are not supported.
        if (elm.startLine != elm.endLine) return;
        const rowIdx = elm.startLine - 1;
        if (!this._row2elms[rowIdx]) {
            let depth = this._als.getStore().depth;
            if (noIndent) depth--;
            this._row2elms[rowIdx] = { depth, elms: [] };
        }
        this._row2elms[rowIdx].elms.push({ token: elm, t: type, tAnc });
    }
    private scanTextLine(textLine: TextLine, elms: XjElement[], depth: number): void {
        elms.sort((a, b) => a.token.startOffset - b.token.startOffset);
        let text = this.generateIndent(depth), before: XjElement = null;
        for (const elm of elms) {
            if (before && !this._nospaceCheckers.some(c => c(before, elm))) text += " ";
            text += elm.token.image;
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
function hasComments(v: CstElement): boolean {
    return v.leadingComments?.length > 0 || v.trailingComments?.length > 0;
}
