import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { AwsSecretType, KubernetesSecretType } from '../../../lib/addons/secrets-store';
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
            secrets: {
                awsSecrets: [
                    {
                        objectName: 'GITHUB_TOKEN',
                        objectType: AwsSecretType.SSMPARAMETER
                    },
                    {
                        objectName: 'PRIVATE_KEY',
                        objectType: AwsSecretType.SECRETSMANAGER
                    }
                ],
                kubernetesSecrets: [
                    {
                        secretName: 'burhnam-github-secrets',
                        type: KubernetesSecretType.OPAQUE,
                        data: [
                            {
                                objectName: 'GITHUB_TOKEN',
                                key: 'github_token'
                            },
                            {
                                objectName: 'PRIVATE_KEY',
                                key: 'private_key'
                            }
                        ]
                    }
                ]
            }
        });
    }
}