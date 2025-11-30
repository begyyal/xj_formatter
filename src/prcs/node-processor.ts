import { CstNode, IToken } from "java-parser";
import { int2array, UString } from "xjs-common";
import { AsyncLocalStorage } from "async_hooks";
import { FormattingOptions, TextDocument, TextEdit, TextLine, workspace } from "vscode";
import { hasComments, isClosingBracket, isNode } from "../func/u";
import { s_out } from "..";
import { DebugSetting } from "../obj/setting";

interface XjRow {
    line: number;
    indent: { depth: number, plsAdj?: boolean };
    elms: XjToken[];
    stackShot: XjNodeLayer[];
}
interface XjNodeLayer {
    id: number;
    line: number;
    n: CstNode;
    indent?: boolean;
}
interface XjToken {
    token: IToken;
    t: string;
    tAnc: string;
}
export class NodeProcessor {
    private _layerCounter = 0;
    private readonly _als = new AsyncLocalStorage<{ document: TextDocument, stack: XjNodeLayer[] }>();
    private readonly _edits: TextEdit[] = [];
    private readonly _row2elms: Record<number, XjRow> = {};
    private readonly _indentUnit = this._options.insertSpaces ? int2array(this._options.tabSize).map(_ => " ").join("") : "\t";
    private readonly _noindentTypes = [
        /^.*[Cc]ompilationUnit$/,
        /^.+Declaration$/,
        /^.+List$/,
        "blockStatements"
    ];
    private readonly _noindentChecker: ((n: CstNode) => boolean)[] = [
        n => this._noindentTypes.some(t => n.name.match(t))
    ];
    private readonly _nospaceCheckers: ((b: XjToken, e: XjToken) => boolean)[] = [
        (b, e) => "Dot" === b.t || ["Semicolon", "Dot", "Comma"].includes(e.t),
        (b, e) => "LBrace" === b.t || "RBrace" === e.t,
        (b, e) => "UnaryPrefixOperator" === b.t || "UnarySuffixOperator" === e.t,
        (b, e) => "LSquare" === b.t || ["LSquare", "RSquare"].includes(e.t),
        (b, e) => !["If", "For", "While", "Switch", "Colon", "Comma", "QuestionMark"].includes(b.t) && e.tAnc != "parenthesisExpression" && "LBrace" === e.t,
        (b, e) => b.tAnc === "typeParameters" && b.t === "Less" || e.tAnc === "typeParameters" && e.t === "Greater",
        (b, e) => b.tAnc === "typeArguments" && b.t === "Less" || e.tAnc === "typeArguments" && e.t === "Greater",
        (_, e) => e.tAnc === "typeArguments" && e.t === "Less",
        (b, e) => b.tAnc === "typeArguments" && b.t === "Greater" && e.tAnc === "fqnOrRefTypePartCommon",
        (b, _) => "At" === b.t,
        (b, e) => [b, e].some(e2 => e2.t === "ColonColon")
    ];
    private readonly _debug: DebugSetting;
    constructor(private readonly _options: FormattingOptions) {
        const d: DebugSetting = workspace.getConfiguration("begyyal.xj-formatter")?.get("debug") ?? {};
        this._debug = d.enable ? d : {};
    }
    exe(document: TextDocument, n: CstNode): TextEdit[] {
        if (this._debug.enable) s_out.appendLine(" ===== collect tokens ===== ");
        this._als.run({ document, stack: [] }, () => this.exeIn(n, 1));
        if (Object.keys(this._row2elms).length === 0) return;
        if (this._debug.enable) s_out.appendLine(" ===== indent adjustment ===== ");
        this.adjustIndent();
        Object.entries(this._row2elms).forEach(e =>
            this.scanTextLine(document.lineAt(Number(e[0])), e[1].elms, e[1].indent.depth));
        return this._edits;
    }
    private exeIn(n: CstNode, line: number): void {
        const stack = this._als.getStore().stack;
        const indent = Object.values(n.children).flatMap(l => l).some(e => (isNode(e) ? e.location.startLine : e.startLine) > line)
            && !this._noindentChecker.some(c => c(n));
        stack.push({ line, indent, n, id: this._layerCounter++ });
        for (const e of Object.entries(n.children)) for (let i = 0; i < e[1].length; i++) {
            const type = e[0], elm = e[1][i];
            if (hasComments(elm)) {
                const comments = (elm.leadingComments ?? []).concat(elm.trailingComments ?? []);
                comments.forEach(c => this.collectToken(c, type, n.name));
            }
            if (isNode(elm)) this.exeIn(elm, elm.location.startLine);
            else if (elm.image) {
                const ia: 1 | 0 | -1 = "Else" === type || indent && isClosingBracket(type) ? -1 : 0;
                this.collectToken(elm, type, n.name, ia);
            }
        }
        stack.pop();
    }
    private collectToken(elm: IToken, type: string, tAnc: string, indentAdjuster: 1 | 0 | -1 = 0): void {
        // currently the tokens over multiple lines are not supported. 
        // (i.e. comment of multiple lines will be ignored as formatting.)
        if (elm.startLine != elm.endLine) return;
        let row = this._row2elms[elm.startLine - 1];
        const getDepth = () => {
            const depth = this._als.getStore().stack.filter(s => s.indent && elm.startLine > s.line).length + indentAdjuster;
            if (elm.startLine === this._debug.printNodeStack) {
                this.printStack(this._als.getStore().stack);
                s_out.appendLine(`image --- "${elm.image}" (${type}) / depth --- ${depth} (adj:${indentAdjuster})}`);
            }
            return { depth, plsAdj: indentAdjuster > 0 };
        }
        if (!row) this._row2elms[elm.startLine - 1] = row =
            { indent: getDepth(), elms: [], stackShot: [...this._als.getStore().stack], line: elm.startLine };
        else if (row.elms[0].token.startOffset > elm.startOffset) {
            row.indent = getDepth();
            row.stackShot = [...this._als.getStore().stack];
        }
        row.elms.push({ token: elm, t: type, tAnc });
        if (row.elms.length > 1 && row.elms.at(-2).token.startOffset > elm.startOffset)
            row.elms.sort((a, b) => a.token.startOffset - b.token.startOffset);
    }
    private adjustIndent(): void {
        let rows = Object.values(this._row2elms), br = rows[0], adjStack: number[] = [];
        for (let row of rows) {
            for (let d = adjStack.length - 1, i = 0; d >= 0; d--, i++)
                if (!row.stackShot.map(s => s.id).includes(adjStack[d])) {
                    if (this._debug.printIndentAdjustment)
                        s_out.appendLine(`end adj   => ${row.elms[0].token.startLine.toString().padEnd(4)}: ${adjStack[d]}`);
                    adjStack.pop();
                } else break;
            const brIndent = br.indent.depth + adjStack.length;
            if (brIndent + 1 < row.indent.depth)
                int2array(row.indent.depth - brIndent - 1).reverse().forEach(i => {
                    adjStack.push(this.getIndentScope(row, i + 1));
                    if (this._debug.printIndentAdjustment)
                        s_out.appendLine(`start adj => ${row.elms[0].token.startLine.toString().padEnd(4)}: ${adjStack.at(-1)}`);
                });
            row.indent.depth -= adjStack.length;
            br = row;
        }
    }
    private getIndentScope(row: XjRow, range: number): number {
        let s = [...row.stackShot], d = range;
        while (s.length > 0 && !(s.at(-1).indent && row.line > s.at(-1).line && --d <= 0)) s.pop();
        return s.at(-1)?.id ?? -1;
    }
    private scanTextLine(textLine: TextLine, elms: XjToken[], depth: number): void {
        let text = UString.repeat(this._indentUnit, depth), before: XjToken = null;
        for (const elm of elms) {
            if (before && !this._nospaceCheckers.some(c => c(before, elm))) text += " ";
            text += elm.token.image;
            before = elm;
        }
        this._edits.push(TextEdit.replace(textLine.range, text));
    }
    private printStack(stack: XjNodeLayer[]): void {
        if (this._debug.enable) stack.forEach(e =>
            s_out.appendLine(`${e.line.toString().padEnd(4)}: ${e.id.toString().padEnd(5)}: / ${e.n.name} / ${e.indent}`));
    }
}
