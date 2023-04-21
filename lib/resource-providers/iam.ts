import * as iam from 'aws-cdk-lib/aws-iam';
import { IManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as spi from '../spi';

/**
 * Role provider that imports an existing role, performing its lookup by the provided name.
 */
export class LookupRoleProvider implements spi.ResourceProvider<iam.IRole> {

    constructor(private readonly roleName: string) { }

    provide(context: spi.ResourceContext): iam.IRole {
        return iam.Role.fromRoleName(context.scope, `${this.roleName}-iam-provider`, this.roleName);
    }

}

/**
 * Resource provider that creates a new role. 
 */
export class CreateRoleProvider implements spi.ResourceProvider<iam.Role> {

    /**
     * Constructor to create role provider.
     * @param roleId role id
     * @param assumedBy @example  new iam.ServicePrincipal('ec2.amazonaws.com') 
     * @param policies 
     */
    constructor(private roleId: string, private assumedBy: iam.IPrincipal, private policies?: IManagedPolicy[]){}

    provide(context: spi.ResourceContext): iam.Role {
        return new iam.Role(context.scope, this.roleId, {
            assumedBy: this.assumedBy,
            managedPolicies: this.policies
        });
    }
}