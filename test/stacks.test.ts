import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { ManualApprovalStep } from 'aws-cdk-lib/pipelines';
import * as blueprints from '../lib';
import { MyVpcStack } from './test-support';

describe('Unit tests for EKS Blueprint', () => {

    test('Usage tracking created', () => {
        let app = new cdk.App();
        // WHEN
        let stack = new blueprints.EksBlueprint(app, { id: 'MyTestStack' });
        console.log(stack.templateOptions.description);
        // THEN
        assertBlueprint(stack);

        app = new cdk.App();
        stack = new blueprints.EksBlueprint(app, { id: 'MyOtherTestStack' }, {
            description: "My awesome description"
        });

        console.log(stack.templateOptions.description);
        // AND
        assertBlueprint(stack);
    });


    test("Stack creation fails due to missing add-on dependency", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.NginxAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(() => blueprint.build(app, 'stack-with-missing-deps')).toThrow("Missing a dependency for AwsLoadBalancerControllerAddOn for stack-with-missing-deps");
    });

    test("Stack creation fails due to conflicting add-ons", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.VpcCniAddOn, new blueprints.KarpenterAddOn, new blueprints.ClusterAutoScalerAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-addons');
        }).toThrow("Deploying stack-with-conflicting-addons failed due to conflicting add-on: KarpenterAddOn.");
    });

    test("Stack creation fails due to wrong node group type for NTH addon", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.AwsNodeTerminationHandlerAddOn);

        expect(() => blueprint.build(app, 'stack-with-missing-deps')).toThrow('AWS Node Termination Handler is only supported for self-managed nodes');
    });

    test('Blueprint builder creates correct stack', async () => {
        let app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.ArgoCDAddOn)
            .addOns(new blueprints.AwsLoadBalancerControllerAddOn)
            .addOns(new blueprints.NginxAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        const stack1 = await blueprint.buildAsync(app, "stack-1");

        assertBlueprint(stack1, 'nginx-ingress', 'argo-cd');
        const blueprint2 = blueprint.clone('us-west-2', '1234567891').addOns(new blueprints.CalicoAddOn);

        const stack2 = await blueprint2.buildAsync(new cdk.App(), 'stack-2');

        assertBlueprint(stack2, 'nginx-ingress', 'argo-cd', 'aws-calico');

        const blueprint3 = blueprints.EksBlueprint.builder().withBlueprintProps({
            addOns: [new blueprints.ArgoCDAddOn],
            name: 'my-blueprint3',
            id: 'my-blueprint3-id'
        });

        const stack3 = await blueprint3.buildAsync(new cdk.App(), 'stack-3');
        assertBlueprint(stack3, 'argo-cd');
    });

    test('Pipeline Builder Creates correct pipeline', () => {

        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder()
            .account("123567891")
            .region('us-west-1')
            .addOns(new blueprints.ArgoCDAddOn)
            .addOns(new blueprints.AwsLoadBalancerControllerAddOn)
            .addOns(new blueprints.NginxAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        const pipeline = blueprints.CodePipelineStack.builder()
            .name("blueprints-pipeline-inaction")
            .owner('shapirov103')
            .repository({
                repoUrl: 'git@github',
                credentialsSecretName: 'github-token',
                name: 'my-iac-pipeline'
            })
            .stage({
                id: 'us-east-1-blueprints',
                stackBuilder: blueprint.clone('us-east-1'),
            })
            .wave( {
                id: "dev",
                stages: [
                    { id: "dev-east-1", stackBuilder: blueprint.clone('us-east-1').id('dev-east-1')},
                    { id: "dev-east-2", stackBuilder: blueprint.clone('us-east-2').id('dev-east-2')},
                ]
            })
            .stage({
                id: 'us-east-2-blueprints',
                stackBuilder: blueprint.clone('us-east-2')
            })
            .wave( {
                id: "test",
                stages: [
                    { id: "test-east-1", stackBuilder: blueprint.clone('us-east-1').id('test-east-1')},
                    { id: "test-east-2", stackBuilder: blueprint.clone('us-east-2').id('test-east-2')},
                ]
            })
            .stage({
                id: 'prod-blueprints',
                stackBuilder: blueprint.clone('us-west-2'),
                stageProps: {
                    pre: [new ManualApprovalStep("prod-blueprints-approval", { comment: "Approval step for production deployment."})]
                }
            });

        const stack = pipeline.build(app, "blueprints-pipeline-id");
        console.log(stack.templateOptions.description);
        expect(stack.templateOptions.description).toContain("Blueprints tracking (qs");
    });

    test("Nested stack add-on creates correct nested stack", async () => {
        const app = new cdk.App();
        const vpcAddOn = new blueprints.NestedStackAddOn( {
            builder: MyVpcStack.builder(),
            id: "vpc-nested-stack"
        });

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(vpcAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        const parentStack =  await blueprint.buildAsync(app, "stack-with-nested");
        const clusterInfo = parentStack.getClusterInfo();
        expect(clusterInfo.getProvisionedAddOn("vpc-nested-stack")).toBeDefined();
    });
});

test("Named resource providers are correctly registered and discovered", async () => {
    const app = new cdk.App();

    const blueprint =  await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .resourceProvider(blueprints.GlobalResources.HostedZone, new blueprints.ImportHostedZoneProvider('hosted-zone-id1', 'my.domain.com'))
        .resourceProvider(blueprints.GlobalResources.Certificate, new blueprints.CreateCertificateProvider('domain-wildcard-cert', '*.my.domain.com', blueprints.GlobalResources.HostedZone))
        .addOns(new blueprints.AwsLoadBalancerControllerAddOn())
        .addOns(new blueprints.ExternalDnsAddOn({hostedZoneResources: [blueprints.GlobalResources.HostedZone]}))
        .addOns(new blueprints.NginxAddOn({
            certificateResourceName: blueprints.GlobalResources.Certificate,
            externalDnsHostname: 'my.domain.com'
        }))
        .addOns(new blueprints.OpaGatekeeperAddOn())
        .teams(new blueprints.ApplicationTeam({
            name: "appteam", namespace: "appteam-ns"
        }))
        .buildAsync(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().getResource(blueprints.GlobalResources.Vpc)).toBeDefined();
    expect(blueprint.getClusterInfo().getResource(blueprints.GlobalResources.HostedZone)).toBeDefined();
    expect(blueprint.getClusterInfo().getResource(blueprints.GlobalResources.Certificate)).toBeDefined();
    expect(blueprint.getClusterInfo().getProvisionedAddOn('NginxAddOn')).toBeDefined();
});

test("Building blueprint with builder properly clones properties", () => {
    const blueprint = blueprints.EksBlueprint.builder().name("builer-test1")
        .addOns(new blueprints.AppMeshAddOn);
    expect(blueprint.props.addOns).toHaveLength(1);

    blueprint.withBlueprintProps({
        version: KubernetesVersion.V1_21
    });

    expect(blueprint.props.addOns).toHaveLength(1);

    const blueprint1 = blueprint.clone();
    blueprint1.addOns(new blueprints.ArgoCDAddOn);

    expect(blueprint.props.addOns).toHaveLength(1);
    expect(blueprint1.props.addOns).toHaveLength(2);

});

test("Building blueprint with version correctly passes k8s version to the cluster", () => {

    const app = new cdk.App();

    const blueprint = blueprints.EksBlueprint.builder().name("builer-version-test1")
        .addOns(new blueprints.ClusterAutoScalerAddOn);
    expect(blueprint.props.addOns).toHaveLength(1);

    blueprint.withBlueprintProps({
        version: KubernetesVersion.V1_21
    });

    const stack = blueprint.build(app, "builder-version-test1");

    expect(stack.getClusterInfo().version).toBeDefined();
 
});

function assertBlueprint(stack: blueprints.EksBlueprint, ...charts: string[]) {
    const template = Template.fromStack(stack);
    for (let chart of charts) {
        template.hasResourceProperties('Custom::AWSCDK-EKS-HelmChart', {
            Chart: chart
        });
    }
    expect(stack.templateOptions.description).toContain("Blueprints tracking (qs");
}