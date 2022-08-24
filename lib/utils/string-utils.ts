
/**
 * Encode utf8 to Base64.
 * @param str 
 * @returns 
 */
export function btoa(str: string) { return Buffer.from(str).toString('base64'); }


/**
 * Decode from base64 (to utf8).
 * @param b64Encoded 
 * @returns 
 */
export function atob(b64Encoded: string) { return Buffer.from(b64Encoded, 'base64').toString(); }

/**
 * Convert kebab case string to camel case
 * @param string
 * @returns
 */
export function kebabToCamel(str: string) { return str.replace(/-./g, x => x[1].toUpperCase()); }

/**
 * Escape the dots in the string
 * @param string
 * @returns
 */
export function escapeDots(str: string) { return str.replace(/\./g, '\\.'); }
