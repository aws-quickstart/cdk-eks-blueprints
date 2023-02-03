
export type OneArgFn<T> = (arg: any) => T;

const isDynamicProxy = Symbol("isDynamicProxy");
const sourceFunction = Symbol("sourceFunction");


export class DummyProxy<T extends object> implements ProxyHandler<T> {

    constructor(private source : OneArgFn<T>) {}

    public get(_: T, key: PropertyKey, receiver: any): any {
        if(key === isDynamicProxy) {
            return true;
        }
        
        if(key === sourceFunction) {
            return this.source;
        }
    }
}

