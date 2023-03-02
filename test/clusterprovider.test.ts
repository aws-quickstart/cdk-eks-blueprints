import * as cdk from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { BlockDeviceVolume, EbsDeviceVolumeType } from 'aws-cdk-lib/aws-autoscaling';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SubnetType } from 'aws-cdk-lib/aws-ec2';
import { CapacityType, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import * as blueprints from '../lib';
import { AsgClusterProvider, MngClusterProvider } from '../lib';

test("Generic cluster provider correctly registers managed node groups", async () => {
    const app = new cdk.App();

    const clusterProvider = blueprints.clusterBuilder()
    .withCommonOptions({
        serviceIpv4Cidr: "10.43.0.0/16"
    })
    .managedNodeGroup({
        id: "mng1",
        maxSize: 2,
        nodeGroupCapacityType: CapacityType.SPOT
    })
    .managedNodeGroup({
        id: "mng2",
        maxSize:1
    })
    .fargateProfile("fp1", {
        selectors: [
            {
                namespace: "default"
            }
        ]
    }).build();

    expect(clusterProvider.props.serviceIpv4Cidr).toBe("10.43.0.0/16");

    const blueprint =  await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .clusterProvider(clusterProvider)
        .addOns(new blueprints.ClusterAutoScalerAddOn)
        .buildAsync(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().nodeGroups).toBeDefined();
    expect(blueprint.getClusterInfo().nodeGroups!.length).toBe(2);
});

test("Generic cluster provider correctly registers autoscaling node groups", () => {
    const app = new cdk.App();

    const clusterProvider = blueprints.clusterBuilder()
    .autoscalingGroup({
        id: "mng1",
        maxSize: 2,
        instanceType: new ec2.InstanceType('m5.large'),
        allowAllOutbound: true,

    })
    .autoscalingGroup({
        id: "mng2",
        maxSize: 1,
        nodeGroupSubnets: {
           subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
    })
    .fargateProfile("fp1", {
        selectors: [
            {
                namespace: "default"
            }
        ]
    }).build();

    const blueprint =  blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .clusterProvider(clusterProvider)
        .addOns(new blueprints.ClusterAutoScalerAddOn)
        .build(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().autoscalingGroups).toBeDefined();
    expect(blueprint.getClusterInfo().autoscalingGroups!.length).toBe(2);
});

test("Mng cluster provider correctly initializes managed node group", () => {
    const app = new cdk.App();

    const clusterProvider = new MngClusterProvider({
        version: KubernetesVersion.V1_24,
        clusterName: "my-cluster",
        forceUpdate:true,
        labels: { "mylabel": "value" },
        diskSize: 34,
        instanceTypes: [new ec2.InstanceType('t3.micro')],
        nodeGroupCapacityType: CapacityType.SPOT,
        nodeGroupSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        }
    });

    const managedNodeGroups = clusterProvider.props.managedNodeGroups!;
    expect(managedNodeGroups.length).toBe(1);
    expect(managedNodeGroups[0].diskSize).toBe(34);
    expect(managedNodeGroups[0].nodeGroupCapacityType).toBe(CapacityType.SPOT);
    expect(managedNodeGroups[0].nodeGroupSubnets).toBeDefined();
    expect(managedNodeGroups[0].nodeGroupSubnets!.subnetType).toBe(ec2.SubnetType.PRIVATE_WITH_EGRESS);


    const blueprint =  blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .clusterProvider(clusterProvider)
        .addOns(new blueprints.ClusterAutoScalerAddOn)
        .build(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().nodeGroups).toBeDefined();
    expect(blueprint.getClusterInfo().nodeGroups!.length).toBe(1);
});

test("Asg cluster provider correctly initializes self-managed node group", () => {
    const app = new cdk.App();

    const clusterProvider = new AsgClusterProvider({
        id: "asg1",
        version: KubernetesVersion.V1_24,
        clusterName: "my-cluster",
        blockDevices: [
            {
                deviceName: "disk1",
                volume: BlockDeviceVolume.ebs(34, { volumeType: EbsDeviceVolumeType.GP3 })
            }
        ],
        instanceType: new ec2.InstanceType('t3.micro'),
        spotPrice: "23",
        nodeGroupSubnets: {
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        },
        vpcSubnets: [ {subnetType:SubnetType.PUBLIC }]
    });

    const autoscalingNodeGroups = clusterProvider.props.autoscalingNodeGroups!;
    expect(autoscalingNodeGroups.length).toBe(1)!;
    expect(autoscalingNodeGroups[0].blockDevices![0].volume!.ebsDevice?.volumeSize).toBe(34)!;
    expect(autoscalingNodeGroups[0].spotPrice).toBe("23")!;
    expect(autoscalingNodeGroups[0].nodeGroupSubnets).toBeDefined();
    expect(autoscalingNodeGroups[0].nodeGroupSubnets!.subnetType).toBe(ec2.SubnetType.PRIVATE_WITH_EGRESS);

    const blueprint =  blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
        .clusterProvider(clusterProvider)
        .addOns(new blueprints.ClusterAutoScalerAddOn)
        .build(app, 'stack-with-resource-providers');
    
    expect(blueprint.getClusterInfo().autoscalingGroups).toBeDefined();
    expect(blueprint.getClusterInfo().autoscalingGroups!.length).toBe(1);
});

test("Kubectl layer is correctly injected for EKS version 1.22", () => {

    const app = new cdk.App();

    const stack = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_22).build(app, "stack-122");
    
    const template = Template.fromStack(stack);

    template.hasResource("AWS::Lambda::LayerVersion", {
        Properties: {
          Description: Match.stringLikeRegexp("/opt/kubectl/kubectl 1.22"),
        },
      });
});

test("Kubectl layer is correctly injected for EKS version 1.23", () => {

    const app = new cdk.App();

    const stack = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_23).build(app, "stack-123");
    
    const template = Template.fromStack(stack);

    template.hasResource("AWS::Lambda::LayerVersion", {
        Properties: {
          Description: Match.stringLikeRegexp("/opt/kubectl/kubectl 1.23"),
        },
      });
});


test("Kubectl layer is correctly injected for EKS version 1.21 and below", () => {
    const app = new cdk.App();

    const stackV122 = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_21).build(app, "stack-122");
    
    const template = Template.fromStack(stackV122);
    template.resourceCountIs("AWS::Lambda::LayerVersion", 0);
});