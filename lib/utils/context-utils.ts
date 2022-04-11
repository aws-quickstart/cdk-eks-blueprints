import { Construct } from "constructs";

/**
 * Looks up default value from context (cdk.json, cdk.context.json and ~/.cdk.json)
 * @param construct 
 * @param key 
 * @param defaultValue 
 * @returns 
 */
export function valueFromContext(construct: Construct, key: string, defaultValue: any) {
    return construct.node.tryGetContext(key) ?? defaultValue;
}