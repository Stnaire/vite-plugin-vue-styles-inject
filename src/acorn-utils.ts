import { BaseNode, Program, ImportDeclaration, ExportNamedDeclaration, CallExpression, ExpressionStatement, ArrayExpression, AssignmentExpression } from "estree";
import { areEqual } from "./utils";

export function isNode<T extends BaseNode>(node: BaseNode, type: string): node is T {
    return node.type === type;
}

export function searchNodes<T = any>(source: BaseNode, type: string, attributes: Record<string, any> = {}): T[] {
    const results: T[] = [];
    iterateNodes(source, (node: any) => {
        if (node.type !== type) {
            return ;
        }
        for (const attr of Object.keys(attributes)) {
            let value: any = node;
            const keys = attr.split('.');
            for (let i = 0; i < keys.length; ++i) {
                value = value[keys[i]];
                if (typeof(value) === 'undefined') {
                    return ;
                }
            }
            if (!areEqual(value, attributes[attr])) {
                return ;
            }
        }
        results.push(node);
    });
    return results;
}

export function iterateNodes(node: BaseNode, callback: (node: BaseNode) => void|boolean): BaseNode|null {
    if (callback(node) === false) {
        return node;
    }
    if (isNode<Program>(node, 'Program')) {
        for (const sub of node.body) {
            iterateNodes(sub, callback);
        }
    } else if (isNode<ImportDeclaration>(node, 'ImportDeclaration')) {
        for (const sub of node.specifiers) {
            iterateNodes(sub, callback);
        }
    } else if ((isNode<ExportNamedDeclaration>(node, 'ExportNamedDeclaration') || isNode<ExportNamedDeclaration>(node, 'ExportDefaultDeclaration')) && node.declaration) {
        iterateNodes(node.declaration, callback);
    } else if (isNode<ExpressionStatement>(node, 'ExpressionStatement') && node.expression) {
        iterateNodes(node.expression, callback);
    } else if (isNode<CallExpression>(node, 'CallExpression') && node.arguments) {
        for (const sub of node.arguments) {
            iterateNodes(sub, callback);
        }
    } else if (isNode<ArrayExpression>(node, 'ArrayExpression') && node.elements) {
        for (const sub of node.elements) {
            if (sub) {
                iterateNodes(sub, callback);
            }
        }
    } else if (isNode<AssignmentExpression>(node, 'AssignmentExpression') && node.right) {
        iterateNodes(node.right, callback);
    }
    return null;
}
