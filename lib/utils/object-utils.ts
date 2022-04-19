import { KubernetesVersion } from "aws-cdk-lib/aws-eks";

export const setPath = (obj : any, path: string, val: any) => { 
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const lastObj = keys.reduce((obj, key) => 
        obj[key] = obj[key] || {}, 
        obj); 
    lastObj[lastKey] = val;
};

export function cloneDeep<T>(source: T): T {
    return Array.isArray(source)
    ? source.map(item => cloneDeep(item))
    : source instanceof Date
    ? new Date(source.getTime())
    : source instanceof KubernetesVersion
    ? source
    : source && typeof source === 'object'
          ? Object.getOwnPropertyNames(source).reduce((o, prop) => {
             Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop)!);
             o[prop] = cloneDeep((source as { [key: string]: any })[prop]);
             return o;
          }, Object.create(Object.getPrototypeOf(source)))
    : source as T;
  }