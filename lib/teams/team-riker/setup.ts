import { ClusterInfo, TeamSetup } from '../../stacks/eks-blueprint-stack';
export class TeamRikerSetup implements TeamSetup {

    readonly name =  'team-riker';
    
    setup(clusterInfo: ClusterInfo) {
        const namespace = clusterInfo.cluster.addManifest(this.name, {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'team-riker' }
        });
    }
}