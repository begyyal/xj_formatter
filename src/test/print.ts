import { CstNode, parse } from "java-parser";
import { UString } from "xjs-common";
import { UFile } from "xjs-node";
import { cstNode2json, isNode } from "../func/u";

const t = UFile.exists("./src/test/target") && UFile.read("./src/test/target", "utf8");
if (!t) throw Error("no target of the printing was specified.");
const text = UFile.read(`./src/test/${t}.java`, "utf8");
const node = parse(text);
const results = [];
function process(n: CstNode, stack: number): void {
    for (const e of Object.entries(n.children)) {
        const type = e[0];
        const indent = UString.repeat("  ", stack);
        results.push(indent + type);
        for (let i = 0; i < e[1].length; i++) {
            const elm = e[1][i];
            if (elm.leadingComments) results.push(`leading comments => ${JSON.stringify(elm.leadingComments)}`);
            if (elm.trailingComments) results.push(`trailing comments => ${JSON.stringify(elm.trailingComments)}`);
            if (isNode(elm)) process(elm, stack + 1);
            else results.push(indent + elm.image);
        }
    }
}
process(node, 0);
UFile.write("./cst.json", cstNode2json(node));
UFile.write("./parsed.txt", results.join("\n"));
