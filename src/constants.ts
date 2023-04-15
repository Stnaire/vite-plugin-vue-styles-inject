import { generatePlaceholderId } from "./placeholder-utils";

/**
 * A random function name to avoid collisions.
 */
export const InjectStylesFunctionName = `_vpis_${generatePlaceholderId()}`;
