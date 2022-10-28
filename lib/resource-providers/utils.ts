import { IResource } from 'aws-cdk-lib/core';
import { Handler } from '../utils/proxy-utils';
import { ResourceContext, localStack } from '../spi';

export function getNamedResource<T extends IResource = IResource>(resourceName : string) : T {
    return new Proxy({} as T, new Handler(() => {
        const resourceContext: ResourceContext = localStack.getStore();
        return resourceContext.get(resourceName) as T;
    }, { memorize: true}));
}

export function getResource<T extends IResource = IResource>(fn: (context: ResourceContext) => T) : T {
    return new Proxy({} as T, new Handler(() => {
        const resourceContext: ResourceContext = localStack.getStore();
        return fn(resourceContext) as T;
    }, { memorize: true}));
}

