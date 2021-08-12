import { ArnPrincipal } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import { ApplicationTeam } from '../../../lib/teams';
import { ISecret, Secret } from '@aws-cdk/aws-secretsmanager';
import { ClusterInfo, LookupSecretsManagerSecretByName, SecretProvider } from '../../../lib';

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
            teamSecrets: [
                {
                    secretProvider: new GenerateSecretManagerProvider(),
                    kubernetesSecret: {
                        data: [
                            {
                                key: 'username'
                            },
                            {
                                key: 'password'
                            }
                        ]
                    }
                }
            ]
        });
    }
}

class GenerateSecretManagerProvider implements SecretProvider {
    provide(clusterInfo: ClusterInfo): ISecret {
        const secret = new Secret(clusterInfo.cluster.stack, 'AuthCredentials', {
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'user' }),
                generateStringKey: 'password',
            }
        });
        // create this secret first
        clusterInfo.cluster.node.addDependency(secret);
        return secret
    }
}