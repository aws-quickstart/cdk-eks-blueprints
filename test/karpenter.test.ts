import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Template } from 'aws-cdk-lib/assertions';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { BlockDeviceMapping, EbsVolumeMapping } from "../lib";
import { userLog } from "../lib/utils";

describe('Unit tests for Karpenter addon', () => {

    test("Stack creation fails due to conflicting add-ons", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KarpenterAddOn(), new blueprints.ClusterAutoScalerAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-addons');
        }).toThrow("Deploying stack-with-conflicting-addons failed due to conflicting add-on: KarpenterAddOn.");
    });

    test("Stack creation fails due to non-supporting Kubernetes version for Karpenter", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_22)
            .addOns(new blueprints.KarpenterAddOn())
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-non-supporting-kubernetes-version');
        }).toThrow("Please upgrade your EKS Kubernetes version to start using Karpenter.");
    });

    test("Stack creation fails due to Karpenter below minimum version", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_28)
            .addOns(new blueprints.KarpenterAddOn({
                "version": "0.20.1"
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-below-minimum-karpenter-version');
        }).toThrow("Please use Karpenter version 0.21.0 or above.");
    });

    test("Stack creation with warning message due to compatibility issue", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        const warningLog = jest.spyOn(global.console, 'warn');

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_28)
            .addOns(new blueprints.KarpenterAddOn({
                version: '0.30.2'
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        blueprint.build(app, 'stack-with-non-supporting-kubernetes-version');
        expect(warningLog).toHaveBeenCalled();
        expect(warningLog).toHaveBeenCalledTimes(1);
        expect(warningLog).toHaveBeenCalledWith('Please use minimum Karpenter version for this Kubernetes Version: 0.31.0, otherwise you will run into compatibility issues.');
    });

    test("Stack creation fails due to non-existing consolidation props", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_28)
            .addOns(new blueprints.KarpenterAddOn({
                version: "0.34.1",
                ttlSecondsAfterEmpty: 30,
                consolidation: { enabled: true },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-old-consolidation-features');
        }).toThrow("Consolidation features are only available for previous versions of Karpenter.");
    });

    test("Stack creation fails due to non-existing disruption props", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_25)
            .addOns(new blueprints.KarpenterAddOn({
                version: "0.28.0",
                ttlSecondsAfterEmpty: 30,
                disruption: {},
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-new-consolidation-features');
        }).toThrow("Disruption configuration is only supported on versions v0.32.0 and later.");
    });

    test("", () => {

    });

    test("Stack creation fails due to conflicting Karpenter Addon Props", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KarpenterAddOn({
                ttlSecondsAfterEmpty: 30,
                consolidation: { enabled: true },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-karpenter-props');
        }).toThrow("Consolidation and ttlSecondsAfterEmpty must be mutually exclusive.");
    });

    test("Stack creates with interruption enabled", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
	.version("auto")
        .addOns(new blueprints.KarpenterAddOn({
            interruptionHandling: true
        }))
        .build(app, 'karpenter-interruption');

        const template = Template.fromStack(blueprint);
        
        template.hasResource("AWS::SQS::Queue", {
            Properties: {
                QueueName: "karpenter-interruption",
            },
        });
    });

    test("Stack creates without interruption enabled", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
	    .version("auto")
        .addOns(new blueprints.KarpenterAddOn({
            interruptionHandling: false
        }))
        .build(app, 'karpenter-without-interruption');

        const template = Template.fromStack(blueprint);
        
        expect(()=> {
            template.hasResource("AWS::SQS::Queue", {
                Properties: {
                    QueueName: "karpenter-without-interruption",
                },
            });
        }).toThrow("Template has 0 resources with type AWS::SQS::Queue.");
    });

    test("Stack creation succeeds with custom values overrides", async () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        const stack = await blueprint
        .version(KubernetesVersion.V1_27)
        .account("123567891")
        .region("us-west-1")
        .addOns(
            new blueprints.KarpenterAddOn({
            version: 'v0.29.2',
            values: {
                settings: {
                aws: {
                    enableENILimitedPodDensity: true,
                    interruptionQueueName: "override-queue-name",
                },
                },
            },
            })
        )
        .buildAsync(app, "stack-with-values-overrides");

        const template = Template.fromStack(stack);
        template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
        Chart: "karpenter",
        });
        const karpenter = template.findResources("Custom::AWSCDK-EKS-HelmChart");
        const properties = Object.values(karpenter).pop();
        const values = properties?.Properties?.Values;
        expect(values).toBeDefined();
        const valuesStr = JSON.stringify(values);
        expect(valuesStr).toContain("defaultInstanceProfile");
        expect(valuesStr).toContain("override-queue-name");
        expect(valuesStr).toContain("enableENILimitedPodDensity");
    });

    test("Stack creation succeeds with custom values overrides for blockDeviceMapping", async () => {
        const app = new cdk.App();
    
        const blueprint = blueprints.EksBlueprint.builder();

        const ebsVolumeMapping: EbsVolumeMapping = {
            volumeSize: "20Gi",
            volumeType: EbsDeviceVolumeType.GP3,
            deleteOnTermination: true,
        };

        const blockDeviceMapping: BlockDeviceMapping = {
            deviceName: "/dev/xvda",
            ebs: ebsVolumeMapping,
        };

        const stack = await blueprint
          .version("auto")
          .account("123567891")
          .region("us-west-1")
          .addOns(
            new blueprints.KarpenterAddOn({
              subnetTags: {
                "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1",
              },
              securityGroupTags: {
                "kubernetes.io/cluster/blueprint-construct-dev": "owned",
              },
              blockDeviceMappings: [blockDeviceMapping]  
            })
          )
          .buildAsync(app, "stack-with-values-overrides-blockdevicemapping");
    
        const template = Template.fromStack(stack);
        const karpenterResources = template.findResources("Custom::AWSCDK-EKS-KubernetesResource");
        const nodeTemplate = Object.values(karpenterResources).find((karpenterResource) => {
            if (karpenterResource?.Properties?.Manifest) {
                const manifest = karpenterResource.Properties.Manifest;
                if (typeof manifest === "string" && manifest.includes('"kind":"AWSNodeTemplate"')) { 
                    return true;
                }
            }
            return false;
        });
        const manifest = JSON.parse(nodeTemplate?.Properties?.Manifest)[0];
        expect(manifest.kind).toEqual('AWSNodeTemplate');
        expect(manifest.spec.blockDeviceMappings).toBeDefined();
        expect(manifest.spec.blockDeviceMappings.length).toEqual(1);
        expect(manifest.spec.blockDeviceMappings[0]).toMatchObject(blockDeviceMapping);
      });
});
