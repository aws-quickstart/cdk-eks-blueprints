import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';

import { ApplicationTeam } from '../../../lib/teams';

function getUserArns(scope: Construct, key: string): ArnPrincipal[] {
    const context: string = scope.node.tryGetContext(key);
    if (context) {
        return context.split(",").map(e => new ArnPrincipal(e));
    }
    return [];
}

export class TeamRiker extends ApplicationTeam {
    constructor(scope: Construct, networkPoliciesDir: string) {
        super({
            name: "riker",
            users: getUserArns(scope, "team-riker.users"),
            networkPoliciesDir: networkPoliciesDir
        });
    }
}