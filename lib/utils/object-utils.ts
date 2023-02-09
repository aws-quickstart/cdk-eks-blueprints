import { KubernetesVersion } from "aws-cdk-lib/aws-eks";
import { cloneDeepWith } from 'lodash';
import * as nutil from 'node:util/types';

export const setPath = (obj : any, path: string, val: any) => { 
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const lastObj = keys.reduce((obj, key) => 
        obj[key] = obj[key] || {}, 
        obj); 
    lastObj[lastKey] = val;
};

/**
 * Creates a deep clone of an object, retaining types. 
 * @param source 
 * @param resolveFn if passed, this function can perform transformation (e.g. resolve proxies)
 * @returns 
 */
export function cloneDeep<T>(source: T, resolveFn?: (arg: any) => any ): T {
    return cloneDeepWith(source, (value) => {
        if(value && (value instanceof KubernetesVersion || nutil.isProxy(value))) {
            return resolveFn ? resolveFn(value) : value;
        }
        return undefined;
    });
}

export type Writeable<T> = { -readonly [P in keyof T]: T[P] };