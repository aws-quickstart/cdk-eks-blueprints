import { CdkEksBlueprintStack, TeamSetup } from '../../eksBlueprintStack';


export class TeamRikerSetup implements TeamSetup {
  setup(stack: CdkEksBlueprintStack) {
    const namespace = stack.cluster.addManifest('team-riker', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'team-riker' }
    });
  } 
}