import { ClusterInfo, Team } from '../../../lib';

export class TeamRiker implements Team {

    readonly name = 'team-riker';

    setup(clusterInfo: ClusterInfo) {
        clusterInfo.cluster.addManifest(this.name, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-riker' }
        });
    }
}