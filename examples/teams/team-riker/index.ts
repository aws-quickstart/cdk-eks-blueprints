import { ISecret, Secret } from '@aws-cdk/aws-secretsmanager';
import { ApplicationTeam, ClusterInfo, SecretProvider, Team } from '../../../lib';

const name = 'team-riker';
export class TeamRiker extends ApplicationTeam implements Team  {
    constructor() {
        super(
            {
                name,
                teamSecrets: [
                    {
                        secretProvider: new RikerSecretProvider(),
                        kubernetesSecret: {}
                    }
                ]
            }
        );
    }

    setup(clusterInfo: ClusterInfo) {
        clusterInfo.cluster.addManifest(this.name, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name }
        });
    }
}

class RikerSecretProvider implements SecretProvider {
    provide(clusterInfo: ClusterInfo): ISecret  {
        return new Secret(clusterInfo.cluster.stack, 'TemplatedSecret', {
            generateSecretString: {
              secretStringTemplate: JSON.stringify({ username: 'user' }),
              generateStringKey: 'password',
            }
        });
    }
}