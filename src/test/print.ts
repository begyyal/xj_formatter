import { CstNode, parse } from "java-parser";
import { UType } from "xjs-common";
import { UFile } from "xjs-node";

const text = UFile.read("./src/test/Sample.java", "utf8");
const node = parse(text);
const results = [];
function process(n: CstNode): void {
    for (const e of Object.entries(n.children)) {
        const type = e[0];
        results.push(type);
        for (let i = 0; i < e[1].length; i++) {
            const elm = e[1][i];
            if (elm.leadingComments) results.push(`leading comments => ${JSON.stringify(elm.leadingComments)}`);
            if (elm.trailingComments) results.push(`trailing comments => ${JSON.stringify(elm.trailingComments)}`);
            if (isNode(elm)) process(elm);
            else results.push(elm.image);
        }
    }
}
function isNode(v: any): v is CstNode {
    return UType.isDefined(v["location"]);
}
process(node);
UFile.write("./parsed.txt", results.join("\n"));
