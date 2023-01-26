/** 
 * This code was largely copied from https://github.com/rafamel/utils with some small adjustments.
 * MIT license is copied over and distributed with the library. 
*/
export type SourceFn<T> = (...args: Array<void | undefined>) => T;

export interface HandlerOptions {
    memorize?: boolean;
    disable?: { [P in SwitchableKey]?: boolean };
}

export type ProxyHandlerKey = keyof ProxyHandler<any>;

export type SwitchableKey = Exclude<ProxyHandlerKey, 'apply' | 'construct'>;

const isDynamicProxy = Symbol("isDynamicProxy");

export class Handler<T extends object> implements Required<ProxyHandler<T>> {
    public static proxy<T extends object, U extends object = T>(
        source: SourceFn<T>,
        options?: HandlerOptions
    ): U {
        return new Proxy({}, new this(source, options)) as U;
    }
    private fn: () => T;

    private options: HandlerOptions;
    
    public constructor(source: SourceFn<T>, options?: HandlerOptions) {
        this.options = options || {};
        this.fn = this.options.memorize
            ? () => {
                const value = source();
                this.fn = () => value;
                return value;
            }
            : source;
    }
    
    private conditional<T, U>(
        key: SwitchableKey,
        fallback: T,
        fn: () => U
    ): T | U {
        return this.options.disable && this.options.disable[key] ? fallback : fn();
    }

    public get source(): T {
        return this.fn();
    }

    public getPrototypeOf(_: T): object | null {
        return this.conditional('getPrototypeOf', null, () =>
            Reflect.getPrototypeOf(this.source)
        );
    }
    
    public setPrototypeOf(_: T, value: any): boolean {
        return this.conditional('setPrototypeOf', false, () =>
            Reflect.setPrototypeOf(this.source, value)
        );
    }
    
    public isExtensible(_: T): boolean {
        return this.conditional('isExtensible', false, () =>
            Reflect.isExtensible(this.source)
        );
    }
    
    public preventExtensions(_: T): boolean {
        return this.conditional('preventExtensions', false, () =>
            Reflect.preventExtensions(this.source)
        );
    }
    
    public getOwnPropertyDescriptor(
        _: T,
        key: PropertyKey
    ): PropertyDescriptor | undefined {
        return this.conditional('getOwnPropertyDescriptor', undefined, () =>
            Reflect.getOwnPropertyDescriptor(this.source, key)
        );
    }
    
    public has(_: T, key: PropertyKey): boolean {
        return this.conditional('has', false, () => Reflect.has(this.source, key));
    }

    public get(_: T, key: PropertyKey, receiver: any): any {
        if(key === isDynamicProxy) {
            return true;
        }
        
        return this.conditional('get', undefined, () =>
            Reflect.get(this.source, key, receiver)
        );
    }

    public set(_: T, key: PropertyKey, value: any, receiver: any): boolean {
        return this.conditional('set', false, () =>
            Reflect.set(this.source, key, value, receiver)
        );
    }

    public deleteProperty(_: T, key: PropertyKey): boolean {
        return this.conditional('deleteProperty', false, () =>
            Reflect.deleteProperty(this.source, key)
        );
    }

    public defineProperty(
        _: T,
        key: PropertyKey,
        attributes: PropertyDescriptor
    ): boolean {
        return this.conditional('defineProperty', false, () =>
            Reflect.defineProperty(this.source, key, attributes)
        );
    }
    
    public ownKeys(_: T): ArrayLike<string | symbol> {
        return this.conditional('ownKeys', [], () => Reflect.ownKeys(this.source));
    }
    
    public apply(_: T, self: any, args?: any): any {
        return Reflect.apply(this.source as any, self, args);
    }

    public construct(_: T, args: any, target?: any): object {
        return Reflect.construct(this.source as any, args, target);
    }
}