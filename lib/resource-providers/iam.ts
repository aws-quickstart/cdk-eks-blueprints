import * as iam from 'aws-cdk-lib/aws-iam';
import { IManagedPolicy } from 'aws-cdk-lib/aws-iam';
import * as spi from '../spi';
import assert = require('assert');

/**
 * Role provider that imports an existing role, performing its lookup by the provided name.
 */
export class LookupRoleProvider implements spi.ResourceProvider<iam.IRole> {

    constructor(private readonly roleName: string, private readonly mutable?: boolean) { }

    provide(context: spi.ResourceContext): iam.IRole {
        return iam.Role.fromRoleName(context.scope, `${this.roleName}-iam-provider`, this.roleName, 
        { mutable: this.mutable });
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

const httpsPrefix = 'https://';

/**
 * OpenIdConnect provider can lookup an existing OpenIdConnectProvider based on the OIDC provider URL. 
 */
export class LookupOpenIdConnectProvider implements spi.ResourceProvider<iam.IOpenIdConnectProvider> {

    protected readonly id: string;

    constructor(readonly url: string, id?: string) {
        const urlParts = url.split('/');
        assert(url.startsWith(httpsPrefix) && urlParts[urlParts.length - 1], "Invalid OIDC provider URL format");
        this.id = id ?? urlParts[urlParts.length - 1];
    }

    provide(context: spi.ResourceContext): iam.IOpenIdConnectProvider {
        return iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
            context.scope,
            this.id,
            `arn:aws:iam::${context.scope.account}:oidc-provider/${this.url.substring(httpsPrefix.length)}`
        );
    }
}