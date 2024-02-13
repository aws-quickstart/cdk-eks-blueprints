import { Token } from 'aws-cdk-lib';
import { v4 as uuid } from 'uuid';

/**
 * Generates a globally unique identifier.
 * @returns string representation of a GUID
 */
export function uniqueId() : string {
    return uuid();
}

/**
 * Tests the input to see if it is a token (unresolved token representation of a reference in CDK, e.g. ${TOKEN[Bucket.Name.1234]})
 * @param input string containing the string identifier
 * @returns true if the passed input is a token
 */
export function isToken(input: string) : boolean {
    return Token.isUnresolved(input);
} 