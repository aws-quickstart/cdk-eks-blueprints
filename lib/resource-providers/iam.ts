import * as iam from 'aws-cdk-lib/aws-iam';
import * as spi from '../spi';

export class LookupRoleProvider implements spi.ResourceProvider<iam.IRole> {

    constructor(private readonly roleName: string) { }

    provide(context: spi.ResourceContext): iam.IRole {
        console.log(this.roleName);
        return iam.Role.fromRoleName(context.scope, `${this.roleName}-iam-provider`, this.roleName);
    }

}
