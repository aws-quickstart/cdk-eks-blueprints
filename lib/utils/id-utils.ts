import { Token } from 'aws-cdk-lib';
import { v4 as uuid } from 'uuid';

export function uniqueId() : string {
    return uuid();
}

export function isToken(input: string) : boolean {
    return Token.isUnresolved(input);
}