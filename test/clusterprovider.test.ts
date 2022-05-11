
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as blueprints from '../lib';
jest.useFakeTimers();
test("Generic cluster provider correctly registers autoscaling node groups", async () => {
    const app = new cdk.App();

    const clusterProvider = blueprints.clusterBuilder()
    .autoscalingGroup({
        id: "mng1",
        maxSize: 2,
        instanceType: new ec2.InstanceType('m5.large')
    })
    .autoscalingGroup({
        id: "mng2",
        maxSize: 1,
        nodeGroupSubnets: {
           subnetType: ec2.SubnetType.PRIVATE_WITH_NAT
        }
    })
    .fargateProfile("fp1", {
        selectors: [
            {
                namespace: "default"
            }
        ]
    }).build();

    const blueprint =  await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .clusterProvider(clusterProvider)
        .addOns(new blueprints.ClusterAutoScalerAddOn)
        .buildAsync(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().autoscalingGroups).toBeDefined();
    expect(blueprint.getClusterInfo().autoscalingGroups!.length).toBe(2);
});