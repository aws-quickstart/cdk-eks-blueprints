import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { ApplicationTeam } from '../../../lib/teams';
import { LookupSecretsManagerSecretByName, LookupSsmSecretByAttrs } from '../../../lib/addons/secrets-store/secret-provider';

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
            secretProviders: [
                new LookupSecretsManagerSecretByName('PRIVATE_KEY'),
                new LookupSsmSecretByAttrs('GITHUB_TOKEN', 1)
            ]
        });
    }
}