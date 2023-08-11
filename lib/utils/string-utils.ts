
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

/**
 * Removes text between given tokens or the just the tokens themselves.
 * Example use case: YAML manipulation similar to Helm: openToken = "{{ if ... }}", closeToken = "{{ end }}""
 * @param string
 * @returns
 */
export function changeTextBetweenTokens(str: string, openToken: string, closeToken: string, keep: boolean) {
    let regex: RegExp;
    let regexString: string;
    if (keep){
        regexString = ".*(" + openToken + "|" + closeToken + ").*\r?\n";
        regex = new RegExp(regexString, "g");
    } else {
        regexString = openToken + ".*" + closeToken;
        regex = new RegExp(regexString, "sg");
    }

    return str.replace(regex, '');
}
