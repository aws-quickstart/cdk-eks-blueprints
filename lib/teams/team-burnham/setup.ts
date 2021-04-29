import { CdkEksBlueprintStack, ClusterInfo, TeamSetup } from '../../stacks/eks-blueprint-stack';

export class TeamBurnhamSetup implements TeamSetup {
    setup(clusterInfo: ClusterInfo) {
        const namespace = clusterInfo.cluster.addManifest('team-burnham', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-burnham' }
        });
    }
}