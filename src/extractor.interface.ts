import { BaseNode } from "estree";
import { ExtractedComponentInterface } from "./extracted-component.interface";

export interface ExtractorInterface {
    /**
     * Test if the input code, if supported by the extractor.
     * The code must be the code of the ".vue" itself, not a subsidiary file.
     */
    supports(node: BaseNode): boolean;

    /**
     * Try to append data to a component from an input file.
     */
    process(module: ExtractedComponentInterface, id: string, code: string): string;
}
