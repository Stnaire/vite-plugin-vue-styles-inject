import { FunctionDeclaration } from "estree";
import { InjectStylesFunctionName } from "./constants";
import { ExtractedComponentInterface } from "./extracted-component.interface";
import { expandNodeType } from "./utils";

const placeholderIdsCharacters: string = 'abcdefghijklmnopqrstuvwxyz0123456789';
const placeholdersIds: string[] = [];

export function generatePlaceholderId(length: number = 8) {
    const maxTries = 10;
    let tries = 0;
    let generatedId = '';
    do {
        if (tries++ >= maxTries) {
            throw 'Failed to generate a placeholder id.';
        }
        generatedId = '';
        for (let i = 0; i < length; ++i) {
            generatedId += placeholderIdsCharacters.charAt(
                Math.floor(Math.random() * placeholderIdsCharacters.length)
            );
        }
    } while (placeholdersIds.indexOf(generatedId) > -1);
    placeholdersIds.push(generatedId);
    return generatedId;
}

export function injectInFunctionDeclaration(node: FunctionDeclaration, module: ExtractedComponentInterface, code: string): string {
    const flagVarName = `_$${module.id}`;
    let start = expandNodeType(node).start;
    let output = code.substring(0, start);
    const match = output.match(/export\s+$/);
    if (match !== null) {
        start = match.index as number;
        output = code.substring(0, start);
    }
    return output +
        `;let ${flagVarName} = false;\n` +
        code.substring(start, expandNodeType(node.body).start + 1) +
        `
if (!${flagVarName}) {
    ${InjectStylesFunctionName}("${module.placeholder}","${module.id}");
    ${flagVarName} = true;
}\n` +
        code.substring(expandNodeType(node.body).start + 1)
        ;
}

export function injectWhereComment(module: ExtractedComponentInterface, indexStart: number, indexEnd: number, code: string): string {
    const flagVarName = `_$${module.id}`;
    let output = code.substring(0, indexStart);
    return output +
        `;let ${flagVarName} = false;\n` +
        `
if (!${flagVarName}) {
    ${InjectStylesFunctionName}("${module.placeholder}","${module.id}");
    ${flagVarName} = true;
}\n` +
        code.substring(indexEnd)
        ;
}
