import { CdkEksBlueprintStack, TeamSetup } from '../../eksBlueprintStack';

export class TeamBurnhamSetup implements TeamSetup {
  setup(stack: CdkEksBlueprintStack) {
    const namespace = stack.cluster.addManifest('team-burnham', {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: { name: 'team-burnham' }
    });
  } 
}