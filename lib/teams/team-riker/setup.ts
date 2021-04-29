import { CdkEksBlueprintStack, ClusterInfo, TeamSetup } from '../../stacks/eks-blueprint-stack';


export class TeamRikerSetup implements TeamSetup {
    setup(clusterInfo: ClusterInfo) {
        const namespace = clusterInfo.cluster.addManifest('team-riker', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-riker' }
        });
    }
}