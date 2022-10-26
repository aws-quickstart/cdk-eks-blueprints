export * from './certificate';
export * from './hosted-zone';
export * from './vpc';

import * as store from '@leapfrogtechnology/async-store';
import { IResource } from 'aws-cdk-lib/core';
import { Handler } from 'proxy-handler';
import { ResourceContext } from '../spi';

export function getNamedResource<T extends IResource = IResource>(resourceName : string) : T {
    return new Proxy({} as T, new Handler(() => {
        const resourceContext: ResourceContext = store.get('resourceContext');
        return resourceContext.get(resourceName) as T;
    }));
}

export function getResource<T extends IResource = IResource>(fn: (context: ResourceContext) => T) : T {
    return new Proxy({} as T, new Handler(() => {
        const resourceContext: ResourceContext = store.get('resourceContext');
        return fn(resourceContext) as T;
    }));
}

