import { CdkEksBlueprintStack, ClusterInfo, TeamSetup } from '../../eksBlueprintStack';


export class TeamRikerSetup implements TeamSetup {
  setup(clusterInfo: ClusterInfo) {
    const namespace = clusterInfo.cluster.addManifest('team-riker', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'team-riker' }
    });
  } 
}