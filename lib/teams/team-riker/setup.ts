import { ClusterInfo } from '../../stacks/eks-blueprint-stack';
import { Team } from '..';

export class TeamRikerSetup implements Team {

    readonly name = 'team-riker';

    setup(clusterInfo: ClusterInfo) {
        clusterInfo.cluster.addManifest(this.name, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-riker' }
        });
    }
}