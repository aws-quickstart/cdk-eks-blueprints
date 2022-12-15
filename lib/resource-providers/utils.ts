import { IResource } from 'aws-cdk-lib/core';
import { Handler } from '../utils/proxy-utils';
import { ResourceContext, asyncLocalStorage } from '../spi';
import { v4 as uuidv4 } from 'uuid';

export function getNamedResource<T extends IResource = IResource>(resourceName : string) : T {
    return new Proxy({} as T, new Handler(() => {
        const resourceContext: ResourceContext = asyncLocalStorage.getStore()!;
        return resourceContext.get(resourceName) as T;
    }));
}

export function getResource<T extends IResource = IResource>(fn: (context: ResourceContext) => T) : T {
    const uuid = uuidv4();
    return new Proxy({} as T, new Handler(() => {
        const resourceContext: ResourceContext = asyncLocalStorage.getStore()!;
        let result = resourceContext.get(uuid);

        if(result == null) {
            resourceContext.add(uuid, {
                provide(context: ResourceContext) : T {
                    return fn(context);
                }
            });
            result = resourceContext.get(uuid) as T;
        }
        return result as T;
    }));
}

