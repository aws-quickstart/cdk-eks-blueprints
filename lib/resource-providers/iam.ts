import * as iam from 'aws-cdk-lib/aws-iam';
import * as spi from '../spi';

export class LookupRoleProvider implements spi.ResourceProvider<iam.IRole> {

    constructor (readonly roleName :string) {}

    provide(context: spi.ResourceContext): iam.IRole {
        return iam.Role.fromRoleName(context.scope, "", this.roleName);
    }

    get() : iam.IRole {
         return new Proxy(undefined, handler2);
     }
}

const handler2 = {
    get(target, prop, receiver) {
      return "world";
    }
  };