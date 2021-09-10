import { expect as expectCDK, haveResourceLike } from '@aws-cdk/assert';
import { KubernetesVersion } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import * as ssp from '../lib';
import { NestedStackAddOn } from '../lib';
import { MyVpcStack } from './test-support';

test('Usage tracking created', () => {
    const app = new cdk.App();
    // WHEN
    let stack = new ssp.EksBlueprint(app, { id: 'MyTestStack' });
    console.log(stack.templateOptions.description);
    // THEN
    assertBlueprint(stack);

    stack = new ssp.EksBlueprint(app, { id: 'MyOtherTestStack' }, {
        description: "My awesome description"
    });

    console.log(stack.templateOptions.description);
    // AND
    assertBlueprint(stack);

});

test('Blueprint builder creates correct stack', async () => {
    const app = new cdk.App();

    const blueprint = ssp.EksBlueprint.builder();

    blueprint.account("123567891").region('us-west-1')
        .clusterProvider(new ssp.MngClusterProvider( {
            version: KubernetesVersion.V1_20,
        }))
        .addons(new ssp.ArgoCDAddOn)
        .addons(new ssp.NginxAddOn)
        .teams(new ssp.PlatformTeam({ name: 'platform' }));

    const stack1 = await blueprint.buildAsync(app, "stack-1");

    assertBlueprint(stack1, 'nginx-ingress', 'argo-cd');

    const blueprint2 = blueprint.clone('us-west-2', '1234567891').addons(new ssp.CalicoAddOn);
    const stack2 = await blueprint2.buildAsync(app, 'stack-2');

    assertBlueprint(stack2, 'nginx-ingress', 'argo-cd', 'aws-calico');

    const blueprint3 = ssp.EksBlueprint.builder().withBlueprintProps({
        addOns: [new ssp.ArgoCDAddOn],
        name: 'my-blueprint3',
        id: 'my-blueprint3-id'
    });

    const stack3 = await blueprint3.buildAsync(app, 'stack-3');
    assertBlueprint(stack3, 'argo-cd');
});

test('Pipeline Builder Creates correct pipeline', () => {

    const app = new cdk.App();

    const blueprint = ssp.EksBlueprint.builder()
        .account("123567891")
        .region('us-west-1')
        .addons(new ssp.ArgoCDAddOn)
        .addons(new ssp.NginxAddOn)
        .teams(new ssp.PlatformTeam({ name: 'platform' }));

    const pipeline = ssp.CodePipelineStack.builder()
        .name("ssp-pipeline-inaction")
        .owner('shapirov103')
        .repository({
            repoUrl: 'git@github',
            credentialsSecretName: 'github-token',
            name: 'my-iac-pipeline'
        })
        .stage({
            id: 'us-east-1-ssp',
            stackBuilder: blueprint.clone('us-east-1'),
        })
        .stage({
            id: 'us-east-2-ssp',
            stackBuilder: blueprint.clone('us-east-2')
        })
        .stage({
            id: 'prod-ssp',
            stackBuilder: blueprint.clone('us-west-2'),
            stageProps: { manualApprovals: true }
        });

    const stack = pipeline.build(app, "ssp-pipeline-id");
    console.log(stack.templateOptions.description);
    expect(stack.templateOptions.description).toContain("SSP tracking (qs");
});

test("Nested stack add-on creates correct nested stack", async () => {
    const app = new cdk.App();

    const vpcAddOn = new NestedStackAddOn( {
        builder: MyVpcStack.builder(),
        id: "vpc-nested-stack"
    });
    
    const blueprint = ssp.EksBlueprint.builder();

    blueprint.account("123567891").region('us-west-1')
        .addons(vpcAddOn)
        .teams(new ssp.PlatformTeam({ name: 'platform' }));

    const parentStack =  await blueprint.buildAsync(app, "stack-with-nested");
    const clusterInfo = parentStack.getClusterInfo();
    expect(clusterInfo.getProvisionedAddOn("vpc-nested-stack")).toBeDefined();
    
});

function assertBlueprint(stack: ssp.EksBlueprint, ...charts: string[]) {
    for (let chart of charts) {
        expectCDK(stack).to(haveResourceLike('Custom::AWSCDK-EKS-HelmChart', {
            Chart: chart
        }));
    }

    expect(stack.templateOptions.description).toContain("SSP tracking (qs");
}

