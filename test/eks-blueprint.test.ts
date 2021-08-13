import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import { throws } from 'assert';
import { ArgoCDAddOn, ClusterAutoScalerAddOn, NginxAddOn, PlatformTeam } from '../lib';
import * as ssp from '../lib/stacks/eks-blueprint-stack';

test('Usage tracking created', () => {
    const app = new cdk.App();
    // WHEN
    let stack = new ssp.EksBlueprint(app, { id: 'MyTestStack' });
    console.log(stack.templateOptions.description);
    // THEN
    expect(stack.templateOptions.description).toContain("SSP tacking (qs");

    stack = new ssp.EksBlueprint(app, { id: 'MyOtherTestStack' }, {
        description: "My awesome description"
    });

    console.log(stack.templateOptions.description);
    // AND
    expect(stack.templateOptions.description).toContain("SSP tacking (qs");

});

test('Blueprint builder creates correct stack', () => {
    const app = new cdk.App();

    const blueprint = ssp.EksBlueprint.builder();

    blueprint.account("123567891").region('us-west-1')
        .addons(new ArgoCDAddOn)
        .addons(new NginxAddOn)
        .teams(new PlatformTeam({name: 'platform'}));

    console.log('builder1',  (blueprint as any).props);

    const stack1 = blueprint.build(app, "stack-1");
    assertBlueprint(stack1, 'nginx-ingress', 'argo-cd');

    const blueprint2 = blueprint.clone('us-west-2', '1234567891').addons(new ClusterAutoScalerAddOn);
    console.log('builder2',  (blueprint2 as any).props);
    console.log('builder1',  (blueprint as any).props);
    const stack2 = blueprint2.build(app, 'stack-2');

    const blueprint3 = ssp.EksBlueprint.builder().withBlueprintProps({
        addOns: [new ArgoCDAddOn],
        name: 'my-blueprint3', 
        id: 'my-blueprint3-id'
    });
    console.log('builder3',  (blueprint3 as any).props);
    const stack3 = blueprint3.build(app, 'stack-3');

});

function assertBlueprint(stack: cdk.Stack, ...charts: string[]) {
    for(let chart of charts) {
        expectCDK(stack).to(haveResource('Custom::AWSCDK-EKS-HelmChart', {
            chart: chart
        }));
    }    
    
    expect(stack.templateOptions.description).toContain("SSP tacking (qs");
}
