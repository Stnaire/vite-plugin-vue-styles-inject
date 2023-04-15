import { Parser } from 'acorn';
import { BaseNode, ImportDeclaration } from "estree";
import path from 'path';
import type { Plugin } from 'vite';
import { searchNodes } from "./acorn-utils";
import { InjectStylesFunctionName } from "./constants";
import { ExtractedComponentInterface } from "./extracted-component.interface";
import { ExtractorInterface } from "./extractor.interface";
import { generatePlaceholderId, injectPlaceholder } from "./placeholder-utils";
import { isVueComponent, isParsable, isCss } from "./utils";

const injectStylesFunctionDeclaration: string = `function ${InjectStylesFunctionName}(e, t) {
    if (e && "undefined" != typeof document) {
        var d = document.head || document.getElementsByTagName("head")[0],
            a = document.getElementById(t) || document.createElement("style");
        a.id = t, a.type = "text/css", a.appendChild(document.createTextNode(e)), d.appendChild(a)
    }
}`;

let extractedComponents: Record<string, ExtractedComponentInterface> = {};
const extractors: Record<string, ExtractorInterface> = {
    sfc: {
        supports(node: BaseNode): boolean {
            return searchNodes(node, 'FunctionDeclaration', {'id.name': '_sfc_render'}).length > 0;
        },
        process(module: ExtractedComponentInterface, id: string, code: string): string {
            const rootNode = Parser.parse(code, {ecmaVersion: 'latest', sourceType: 'module'});
            const nodes = searchNodes(rootNode, 'FunctionDeclaration', {'id.name': '_sfc_render'});
            if (nodes.length > 0) {
                return injectPlaceholder(nodes[0], module, code);
            }
            return code;
        }
    },
    classComponent: {
        supports(node: BaseNode): boolean {
            return searchNodes(node, 'ImportSpecifier', {'imported.name': 'render', 'local.name': '_sfc_render'}).length > 0;
        },
        process(module: ExtractedComponentInterface, id: string, code: string): string {
            const rootNode = Parser.parse(code, {ecmaVersion: 'latest', sourceType: 'module'});
            const nodes = searchNodes(rootNode, 'FunctionDeclaration', {'id.name': 'render'});
            if (nodes.length > 0) {
                return injectPlaceholder(nodes[0], module, code);
            }
            return code;
        }
    }
};

function registerImports(component: ExtractedComponentInterface, rootNode: BaseNode, id: string): void {
    const from = path.dirname(id);
    const importNodes: ImportDeclaration[] = searchNodes(rootNode, "ImportDeclaration");
    for (const node of importNodes) {
        if (typeof(node.source.value) === 'string' && node.source.value.length > 0 && ['.', '/'].indexOf(node.source.value[0]) > -1) {
            const resolved = path.resolve(from, node.source.value);
            if (component.files.indexOf(resolved) < 0) {
                component.files.push(resolved);
            }
        }
    }
}

function processComponentFile(component: ExtractedComponentInterface,
                              extractor: ExtractorInterface,
                              id: string,
                              code: string): string {
    if (isParsable(id)) {
        return extractor.process(component, id, code);
    }
    if (isCss(id)) {
        const argsIdx = id.indexOf('?');
        const params = new URLSearchParams(id);
        const stripedId = (argsIdx > -1 ? id.substring(0, argsIdx) : id) + '?' + [...params.keys()].reduce((acc: string[], i: string) => {
            if (['type', 'index'].indexOf(i) > -1) {
                acc.push(`${i}=${params.get(i)}`);
            }
            return acc;
        }, []).join('&');
        component.css[stripedId] = code.replace(/(\r\n|\n|\r)/gm, '').replaceAll('"', '\\"');
        return '';
    }
    return code;
}

export default function VueStylesInject(): Plugin {
    return {
        name: 'vue-styles-inject',
        apply: 'build',

        async transform(code, id) {
            const _isVueComponent = isVueComponent(id);
            if (_isVueComponent) {
                const placeholderId = '__vpsi_' + generatePlaceholderId();
                const component: ExtractedComponentInterface = typeof(extractedComponents[id]) === 'undefined' ? {
                    id: placeholderId,
                    path: id,
                    files: [],
                    placeholder: `__#__vite-plugin-styles-inject_${placeholderId}__#__`,
                    css: {}
                } : extractedComponents[id];
                const node = Parser.parse(code, {ecmaVersion: 'latest', sourceType: 'module'});
                registerImports(component, node, id);
                for (const extractorType of Object.keys(extractors)) {
                    const extractor = extractors[extractorType];
                    if (extractor.supports(node)) {
                        component.type = extractorType;
                        extractedComponents[id] = component;
                        return processComponentFile(component, extractor, id, code);
                    }
                }
                return code;
            }

            for (const candidateId of Object.keys(extractedComponents)) {
                const component = extractedComponents[candidateId];
                if ((_isVueComponent || component.files.indexOf(id) > -1) && component.type) {
                    if (typeof(extractors[component.type]) === 'object') {
                        return processComponentFile(component, extractors[component.type], id, code);
                    }
                }
            }
            return code;
        },

        generateBundle(options, bundle): void {
            let finalInjectFunctionName: string|null = null;
            for (const fileName of Object.keys(bundle)) {
                const chunk: any = bundle[fileName];
                if (typeof(chunk) === 'object' && typeof(chunk.code) === 'string') {
                    for (const componentId of Object.keys(extractedComponents)) {
                        const component = extractedComponents[componentId];
                        if (finalInjectFunctionName === null) {
                            let endIdx = chunk.code.indexOf(component.placeholder);
                            if (endIdx > -1 && chunk.code[endIdx - 2] === '(') {
                                endIdx -= 2;
                                let startIdx = endIdx;
                                while (--startIdx >= 0 && chunk.code[startIdx].match(/[a-z0-9_]/));
                                finalInjectFunctionName = chunk.code.substring(startIdx + 1, endIdx);
                            }
                        }
                        chunk.code = chunk.code.replaceAll(component.placeholder, Object.values(component.css).join(' '));
                    }
                }
                if (finalInjectFunctionName) {
                    chunk.code = injectStylesFunctionDeclaration.replace(InjectStylesFunctionName, finalInjectFunctionName) + "\n" + chunk.code;
                }
            }
        },
    };
}
