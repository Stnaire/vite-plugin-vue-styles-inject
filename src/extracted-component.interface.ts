export interface ExtractedComponentInterface {
    /**
     * An id unique to each instance.
     */
    id: string;

    /**
     * Extractor type.
     */
    type?: string;

    /**
     * Absolute path to the ".vue" file.
     */
    path: string;

    /**
     * List of all the files imported from the root ".vue" file or its dependencies.
     */
    files: string[];

    /**
     * Placeholder used to locate the CSS injection spot in the final source.
     */
    placeholder?: string;

    /**
     * Css code of the component.
     */
    css: Record<string, string>;
}
