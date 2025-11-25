import { CstElement, CstNode } from "java-parser";
import { UArray, UObj, UType } from "xjs-common";

export function isNode(v: any): v is CstNode {
    return UType.isDefined(v["location"]);
}
export function isTernary(n: CstNode): boolean {
    return !!n && UArray.eq(Object.keys(n.children), ["binaryExpression", "QuestionMark", "expression", "Colon"]);
}
export function hasComments(v: CstElement): boolean {
    return v.leadingComments?.length > 0 || v.trailingComments?.length > 0;
}
export function cstNode2json(n: CstNode, prunedProps: string[] = ["START_CHARS_HINT", "categoryMatchesMap", "categoryMatches", "CATEGORIES", "location"]): string {
    return JSON.stringify(UObj.crop(n, prunedProps, { removeKeys: true, recursive: true }));
}