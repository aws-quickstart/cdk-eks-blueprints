import * as nutil from 'node:util/types';

export type OneArgFn<T> = (arg: any) => T;

export const isDynamicProxy = Symbol("isDynamicProxy");
export const sourceFunction = Symbol("sourceFunction");


export class DummyProxy<T extends object> implements ProxyHandler<T> {

    constructor(private source : OneArgFn<T>) {}

    public get(_: T, key: PropertyKey): any {
        if(key === isDynamicProxy) {
            return true;
        }
        
        if(key === sourceFunction) {
            return this.source;
        }

        return undefined; 
    }
}

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

