import * as spi from "../spi";
import * as iam from "aws-cdk-lib/aws-iam";
import {IManagedPolicy} from "aws-cdk-lib/aws-iam";
import {getEKSNodeIpv6PolicyDocument} from '../../lib/utils/ipv6-utils';

/**
 * Resource provider that creates a new role with ipv6 permissions.
 * Especially, Node management roles (requires ipv6 permissions).
 */
export class CreateIPv6NodeRoleProvider implements spi.ResourceProvider<iam.Role> {
    /**
     * Constructor to create role provider.
     * @param roleId role id
     * @param assumedBy @example  new iam.ServicePrincipal('ec2.amazonaws.com')
     * @param policies
     */
    constructor(private roleId: string, private assumedBy: iam.IPrincipal, private policies?: IManagedPolicy[]){}

    provide(context: spi.ResourceContext): iam.Role {
        const role = new iam.Role(context.scope, this.roleId, {
            assumedBy: this.assumedBy,
            managedPolicies: this.policies
        });
        const nodeIpv6Policy = new iam.Policy(context.scope, 'node-Ipv6-Policy', {
            document: getEKSNodeIpv6PolicyDocument() });
        role.attachInlinePolicy(nodeIpv6Policy);
        return role;
    }
}
