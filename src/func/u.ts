import { CstElement, CstNode } from "java-parser";
import { UObj, UType } from "xjs-common";

export function isNode(v: any): v is CstNode {
    return UType.isDefined(v["location"]);
}
export function isClosingBracket(t: string): boolean {
    return !!t && ["RBrace", "RSquare", "RCurly"].includes(t);
}
export function hasComments(v: CstElement): boolean {
    return v.leadingComments?.length > 0 || v.trailingComments?.length > 0;
}
export function cstNode2json(n: CstNode, prunedProps: string[] = ["START_CHARS_HINT", "categoryMatchesMap", "categoryMatches", "CATEGORIES", "location"]): string {
    return JSON.stringify(UObj.crop(n, prunedProps, { removeKeys: true, recursive: true }));
}