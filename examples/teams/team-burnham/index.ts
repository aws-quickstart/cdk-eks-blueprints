import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { ApplicationTeam } from '../../../lib/teams';
import { GenerateSecretManagerProvider } from '../../../lib';

function getUserArns(scope: Construct, key: string): ArnPrincipal[] {
    const context: string = scope.node.tryGetContext(key);
    if (context) {
        return context.split(",").map(e => new ArnPrincipal(e));
    }
    return [];
}

export class TeamBurnham extends ApplicationTeam {
    constructor(scope: Construct, teamManifestDir: string) {
        super({
            name: "burnham",
            users: getUserArns(scope, "team-burnham.users"),
            teamSecrets: [
                {
                    secretProvider: new GenerateSecretManagerProvider('team-burnham-secret-id','AuthPassword'),
                    kubernetesSecret: {
                        secretName: 'auth-password',
                        data: [
                            {
                                key: 'password'
                            }
                        ]
                    }
                }
            ],
            teamManifestDir: teamManifestDir
        });
    }
}