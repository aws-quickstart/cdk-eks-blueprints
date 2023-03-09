import * as nutil from 'node:util/types';

export type OneArgFn<T> = (arg: any) => T;

/**
 * Symbol that uniquely designates that a particular proxy is instance of our DummyProxy
 */
export const isDynamicProxy = Symbol("isDynamicProxy");

/**
 * Symbol that retrieves the source function from the proxy. This function is expected to create the required target (e.g. resource).
 */
export const sourceFunction = Symbol("sourceFunction");

/**
 * Simple proxy implementation that will require resolution at runtime (enables lazy loading).
 * Unlike dynamic proxy that can create target on the fly, this proxy
 * just a place-holder that supplies the function that can be used to resolve the target. 
 * Since most CDK constructs are not idempotent (meaning you can not call a create function twice, the second will fail)
 * this design choice was the simplest to support declarative resources. 
 * Customers can clone the supplied JSON structure with cloneDeep and replace proxies with the actual targets as part of that process.
 */
export class DummyProxy<T extends object> implements ProxyHandler<T> {

    constructor(private source : OneArgFn<T>) {}

    public get(_: T, key: PropertyKey): any {
        if(key === isDynamicProxy) {
            return true;
        }
        
        if(key === sourceFunction) {
            return this.source;
        }

        return new Proxy({} as any, new DummyProxy((arg) => {
            return (this.source(arg) as any)[key];
        }));
    }
}

/**
 * Function resolves the proxy with the target, that enables lazy loading use cases.
 * @param value potential proxy to resolve
 * @param arg represents the argument that should be passed to the resolution function (sourceFunction).
 * @returns 
 */
export function resolveTarget(value: any, arg: any) {
    if(nutil.isProxy(value)) {
        const object : any = value;
        if(object[isDynamicProxy]) {
            const fn: OneArgFn<any>  = object[sourceFunction];
            return fn(arg);
        }
    }
    return value;
}

