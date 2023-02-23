import { IResource } from 'aws-cdk-lib/core';
import { DummyProxy } from '../utils/proxy-utils';
import { ResourceContext } from '../spi';
import { v4 as uuid } from 'uuid';

/**
 * Creates a proxy to the named resource provider. This proxy will resolve to the type of the 
 * resource provider under the provided name. 
 * It enables getting references to resources outside of the Stack construct and using them with the blueprint:
 * @example
 * const app = new cdk.App();
 * const adminRole: iam.IRole = blueprints.getNamedResource("my-admin-role""); // note, there is no stack class here
 * 
 * const clusterProvider = new blueprints.GenericClusterProvider({
     mastersRole: adminRole,
     ... other props
 * });
 * @param resourceName 
 * @returns 
 */
export function getNamedResource<T extends IResource = IResource>(resourceName : string) : T {
    return new Proxy({} as T, new DummyProxy((resourceContext: ResourceContext) => {
        return resourceContext.get(resourceName) as T;
    }));
}

/**
 * Creates a proxy to an anonymous resource. This function allows passing the provider function as input.  
 * It enables creating ad-hoc references outside of the Stack construct and using them with the blueprint.
 * Designed for cases when resource is defined once and needed in a single place.
 * @example
 * const app = new cdk.App();
 * const clusterProvider = new blueprints.GenericClusterProvider({
 *   mastersRole: blueprints.getResource(context => { // will generate a unique name for resource. 
        return new iam.Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal()});
    }),
    ... other props
});
 * @param resourceName 
 * @returns 
 */
export function getResource<T extends IResource = IResource>(fn: (context: ResourceContext) => T) : T {
    const uid = uuid();
    return new Proxy({} as T, new DummyProxy((resourceContext: ResourceContext) => {
        let result = resourceContext.get(uid);
        if(result == null) {
            resourceContext.add(uid, {
                provide(context: ResourceContext) : T {
                    return fn(context);
                }
            });
            result = resourceContext.get(uid) as T;
        }
        return result as T;
    }));
}
