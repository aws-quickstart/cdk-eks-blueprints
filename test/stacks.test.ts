import { expect as expectCDK, haveResourceLike } from '@aws-cdk/assert';
import { KubernetesVersion } from '@aws-cdk/aws-eks';
import * as cdk from '@aws-cdk/core';
import * as ssp from '../lib';
import { ApplicationTeam, AwsLoadBalancerControllerAddOn, ExternalDnsAddon, GlobalResources, ImportHostedZoneProvider, NestedStackAddOn, NginxAddOn } from '../lib';
import { CreateCertificateProvider } from '../lib/resource-providers/certificate';
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
        .addOns(new ssp.ArgoCDAddOn)
        .addOns(new ssp.AwsLoadBalancerControllerAddOn)
        .addOns(new ssp.NginxAddOn)
        .teams(new ssp.PlatformTeam({ name: 'platform' }));

    const stack1 = await blueprint.buildAsync(app, "stack-1");

    assertBlueprint(stack1, 'nginx-ingress', 'argo-cd');

    const blueprint2 = blueprint.clone('us-west-2', '1234567891').addOns(new ssp.CalicoAddOn);
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
        .addOns(new ssp.ArgoCDAddOn)
        .addOns(new ssp.AwsLoadBalancerControllerAddOn)
        .addOns(new ssp.NginxAddOn)
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
        .addOns(vpcAddOn)
        .teams(new ssp.PlatformTeam({ name: 'platform' }));

    const parentStack =  await blueprint.buildAsync(app, "stack-with-nested");
    const clusterInfo = parentStack.getClusterInfo();
    expect(clusterInfo.getProvisionedAddOn("vpc-nested-stack")).toBeDefined();
    
});

test("Named resource providers are correctly registered and discovered", async () => {
    const app = new cdk.App();

    const blueprint =  await ssp.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .resourceProvider(GlobalResources.HostedZone ,new ImportHostedZoneProvider('hosted-zone-id1', 'my.domain.com'))
        .resourceProvider(GlobalResources.Certificate, new CreateCertificateProvider('domain-wildcard-cert', '*.my.domain.com', GlobalResources.HostedZone))
        .addOns(new AwsLoadBalancerControllerAddOn())
        .addOns(new ExternalDnsAddon({hostedZoneResources: [GlobalResources.HostedZone]}))
        .addOns(new NginxAddOn({
            certificateResourceName: GlobalResources.Certificate,
            externalDnsHostname: 'my.domain.com'
        }))
        .teams(new ApplicationTeam({
            name: "appteam", namespace: "appteam-ns"
        }))
        .buildAsync(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().getResource(GlobalResources.Vpc)).toBeDefined();
    expect(blueprint.getClusterInfo().getResource(GlobalResources.HostedZone)).toBeDefined();
    expect(blueprint.getClusterInfo().getResource(GlobalResources.Certificate)).toBeDefined();
    expect(blueprint.getClusterInfo().getProvisionedAddOn('NginxAddOn')).toBeDefined();
});

function assertBlueprint(stack: ssp.EksBlueprint, ...charts: string[]) {
    for (let chart of charts) {
        expectCDK(stack).to(haveResourceLike('Custom::AWSCDK-EKS-HelmChart', {
            Chart: chart
        }));
    }

    expect(stack.templateOptions.description).toContain("SSP tracking (qs");
}

