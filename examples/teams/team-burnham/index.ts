import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { SecretType } from '../../../lib/addons/secrets-store';
import { ApplicationTeam } from '../../../lib/teams';

function getUserArns(scope: Construct, key: string): ArnPrincipal[] {
    const context: string = scope.node.tryGetContext(key);
    if (context) {
        return context.split(",").map(e => new ArnPrincipal(e));
    }
    return [];
}

export class TeamBurnham extends ApplicationTeam {
    constructor(scope: Construct) {
        super({
            name: "burnham",
            users: getUserArns(scope, "team-burnham.users"),
            secrets: [
                {
                    secretName: 'GITHUB_TOKEN',
                    secretType: SecretType.SECRETSMANAGER,
                }
            ],
        });
    }
}