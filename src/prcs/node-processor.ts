import { CstNode, IToken } from "java-parser";
import { int2array, UString } from "xjs-common";
import { AsyncLocalStorage } from "async_hooks";
import { FormattingOptions, TextDocument, TextEdit, TextLine } from "vscode";
import { hasComments, isNode, isTernary } from "../func/u";

interface XjElement {
    token: IToken;
    t: string;
    tAnc: string;
}
export class NodeProcessor {
    private readonly _als = new AsyncLocalStorage<{
        document: TextDocument,
        stack: { line: number, n: CstNode, indent?: boolean, sibling: number }[]
    }>();
    private readonly _edits: TextEdit[] = [];
    private readonly _row2elms: Record<number, {
        indentDepth: number,
        nodeDepth: number,
        elms: XjElement[]
    }> = {};
    private readonly _indentUnit = this._options.insertSpaces ? int2array(this._options.tabSize).map(_ => " ").join("") : "\t";
    private readonly _noindentTypes = [
        /^.*[Cc]ompilationUnit$/,
        /^.+Declaration$/,
        /^.+List$/,
        "blockStatements",
        "conditionalExpression"
    ];
    private readonly _noindentChecker: ((b: CstNode, n: CstNode) => boolean)[] = [
        (b, _) => this._noindentTypes.some(t => b.name.match(t))
    ];
    private readonly _nospaceCheckers: ((b: XjElement, e: XjElement) => boolean)[] = [
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
    constructor(private readonly _options: FormattingOptions) { }
    exe(document: TextDocument, n: CstNode): TextEdit[] {
        this._als.run({ document, stack: [] }, () => this.exeIn(n, 1));
        if (Object.keys(this._row2elms).length === 0) return;
        this.adjustIndent();
        Object.entries(this._row2elms).forEach(e =>
            this.scanTextLine(document.lineAt(Number(e[0])), e[1].elms, e[1].indentDepth));
        return this._edits;
    }
    private exeIn(n: CstNode, line: number, sibling: number = 0): void {
        const stack = this._als.getStore().stack;
        const parentNode = stack[stack.length - 1];
        let indent = line > parentNode?.line && !this._noindentChecker.some(c => c(parentNode.n, n));
        const isElseIf = this.underElseIf(n);
        indent &&= !isElseIf && !this.underElseIf();
        indent ||= isTernary(n);
        stack.push({ line, indent, n, sibling });
        const depth = stack.filter(s => s.indent).length;
        const shallowed = () => depth > stack.filter(s => s.indent).length;
        for (const e of Object.entries(n.children)) {
            const type = e[0];
            for (let i = 0; i < e[1].length; i++) {
                const elm = e[1][i];
                if (hasComments(elm)) {
                    const comments = (elm.leadingComments ?? []).concat(elm.trailingComments ?? []);
                    comments.forEach(c => this.collectToken(c, type, n.name));
                }
                if (isNode(elm)) this.exeIn(elm, elm.location.startLine, i);
                else if (elm.image) {
                    let ia: 1 | 0 | -1 = isElseIf && "Else" === type ? -1 : "BinaryOperator" === type ? 1 : 0;
                    if (ia < 0 && shallowed()) ia = 0;
                    this.collectToken(elm, type, n.name, ia);
                }
            }
        }
        stack.pop();
    }
    private underElseIf(n?: CstNode): boolean {
        const stack = this._als.getStore().stack;
        const adjuster = n ? 0 : 1;
        if (stack.length < 2 + adjuster) return false;
        return (n ?? stack[stack.length - 1].n).name === "ifStatement"
            && stack[stack.length - 1 - adjuster].n.name === "statement" && stack[stack.length - 1 - adjuster].sibling === 1
            && stack[stack.length - 2 - adjuster].n.name === "ifStatement";
    }
    private collectToken(elm: IToken, type: string, tAnc: string, indentAdjuster: 1 | 0 | -1 = 0): void {
        // currently the tokens over multiple lines are not supported. 
        // (i.e. comment of multiple lines will be ignored as formatting.)
        if (elm.startLine != elm.endLine) return;
        const rowIdx = elm.startLine - 1;
        const getDepth = () =>
            this._als.getStore().stack.filter(s => s.indent).length + indentAdjuster;
        const getNodeDepth = () => {
            const s = [...this._als.getStore().stack];
            while (s.length > 0 && !s[s.length - 1].indent) s.pop();
            return s.length;
        }
        if (!this._row2elms[rowIdx])
            this._row2elms[rowIdx] = { indentDepth: getDepth(), elms: [], nodeDepth: getNodeDepth() };
        else if (this._row2elms[rowIdx].elms[0].token.startColumn > elm.startColumn) {
            this._row2elms[rowIdx].indentDepth = getDepth();
            this._row2elms[rowIdx].nodeDepth = getNodeDepth();
        }
        this._row2elms[rowIdx].elms.push({ token: elm, t: type, tAnc });
    }
    private adjustIndent(): void {
        let rows = Object.values(this._row2elms), br = rows[0], adjStack: { adj: number, nd: number }[] = [];
        for (let row of rows) {
            const brIndentOrigin = br.indentDepth + adjStack.map(e => e.adj).reduce((a, b) => a + b, 0);
            if (brIndentOrigin + 1 < row.indentDepth) {
                adjStack.push({ adj: row.indentDepth - brIndentOrigin - 1, nd: row.nodeDepth });
            } else for (let d = adjStack.length - 1, i = 0; d >= 0; d--, i++)
                if (adjStack[d].nd > row.nodeDepth) {
                    const e = adjStack.pop();
                    if (i === 0 && ["RBrace", "RSquare", "RCurly"].includes(row.elms[0]?.t))
                        row.indentDepth -= e.adj;
                } else break;
            adjStack.forEach(e => row.indentDepth -= e.adj);
            br = row;
        }
    }
    private scanTextLine(textLine: TextLine, elms: XjElement[], depth: number): void {
        elms.sort((a, b) => a.token.startOffset - b.token.startOffset);
        let text = UString.repeat(this._indentUnit, depth), before: XjElement = null;
        for (const elm of elms) {
            if (before && !this._nospaceCheckers.some(c => c(before, elm))) text += " ";
            text += elm.token.image;
            before = elm;
        }
        this._edits.push(TextEdit.replace(textLine.range, text));
    }
}
