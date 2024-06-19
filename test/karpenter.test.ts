import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Template } from 'aws-cdk-lib/assertions';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { BlockDeviceMapping, EbsVolumeMapping, NodePoolRequirementValues } from "../lib";

const defaultReq: NodePoolRequirementValues = [
    { 
        key: "karpenter.k8s.aws/instance-category",
        operator: "In",
        values: ["c", "m", "r"]
    },
    { 
        key: "karpenter.k8s.aws/instance-cpu",
        operator: "In",
        values: ["4", "8", "16", "32"]
    },
    { 
        key: "karpenter.k8s.aws/instance-hypervisor", 
        operator: "In", 
        values: ["nitro"]
    },
    {
        key: "karpenter.k8s.aws/instance-generation",
        operator: "Gt",
        values: ["2"]},
    {
        key: "topology.kubernetes.io/zone",
        operator: "In",
        values: ["us-west-2a", "us-west-2b"]
    },
    {
        key: "kubernetes.io/arch",
        operator: "In",
        values: ["arm64", "amd64"]
    },
    {
        key: "karpenter.sh/capacity-type",
        operator: "In",
        values: ["spot", "on-demand"]
    }
];

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
                "version": "v0.20.1"
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
                version: 'v0.30.2'
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        blueprint.build(app, 'stack-with-non-supporting-kubernetes-version');
        expect(warningLog).toHaveBeenCalled();
        expect(warningLog).toHaveBeenCalledTimes(1);
        expect(warningLog).toHaveBeenCalledWith('Please use minimum Karpenter version for this Kubernetes Version: 0.31.0, otherwise you will run into compatibility issues.');
    });

    test("Stack creation fails due to providing Detailed Monitoring in non-supported Karpenter version", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_24)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.21.0",
                nodePoolSpec: {
                    requirements: defaultReq,
                },
                ec2NodeClassSpec: {
                    amiFamily: "AL2",
                    subnetSelector: {
                        "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1",
                    },
                    securityGroupSelector: {
                        "kubernetes.io/cluster/blueprint-construct-dev": "owned",
                    },
                    detailedMonitoring: true
                }
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-old-consolidation-features');
        }).toThrow("Detailed Monitoring is not available in this version of Karpenter. Please upgrade to at least 0.23.0.");
        
    });

    test("Stack creation fails due to disruption budget prop provided in non-supported Karpenter version", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_28)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.33.0",
                nodePoolSpec: {
                    requirements: defaultReq,
                    ttlSecondsAfterEmpty: 30,
                    disruption: {
                        consolidationPolicy: "WhenEmpty",
                        consolidateAfter: "20m",
                        expireAfter: "20m",
                        budgets: [
                            {nodes: "20%"}
                        ]
                    }
                },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-old-consolidation-features');
        }).toThrow("You cannot set disruption budgets for this version of Karpenter. Please upgrade to 0.34.0 or higher.");
    });

    test("Stack creation fails due to non-existing consolidation props", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_28)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.34.1",
                nodePoolSpec: {
                    requirements: defaultReq,
                    ttlSecondsAfterEmpty: 30,
                    consolidation: { enabled: true },
                },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-old-consolidation-features');
        }).toThrow("Consolidation features are only available for previous versions of Karpenter.");
    });

    test("Stack creation fails due to setting consolidateAfter prop when the policy is set to WhenUnderutilized", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KarpenterAddOn({
                nodePoolSpec:{
                    requirements: defaultReq,
                    disruption: {
                        consolidationPolicy: "WhenUnderutilized",
                        consolidateAfter: "30h"
                    },
                }
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-incorrect-consolidateAfter-values');
        }).toThrow("You cannot set consolidateAfter value if the consolidation policy is set to Underutilized.");
    });

    test("Stack creation fails due to non-existing disruption props", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_25)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.28.0",
                nodePoolSpec: {
                    requirements: defaultReq,
                    disruption: {},
                }
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-new-consolidation-features');
        }).toThrow("Disruption configuration is only supported on versions v0.32.0 and later.");
    });

    test("Stack creation fails due to unprovided AMI Family for Beta CRD EC2NodeClass", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_25)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.34.1",
                nodePoolSpec: {
                    requirements: defaultReq,
                    disruption: {},
                },
                ec2NodeClassSpec: {
                    subnetSelectorTerms: [{
                        tags: { "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1" }
                    }],
                    securityGroupSelectorTerms: [{
                        tags: { "kubernetes.io/cluster/blueprint-construct-dev": "owned" }
                    }],
                }
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-missing-ami-family-in-node-class');
        }).toThrow("Please provide the AMI Family for your EC2NodeClass.");
    });

    test("", () => {

    });

    test("Stack creation fails due to conflicting Karpenter Addon Props", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_23)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.21.0",
                nodePoolSpec: {
                    requirements: defaultReq,
                    ttlSecondsAfterEmpty: 30,
                    consolidation: { enabled: true },
                }
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
        .addOns(new blueprints.KarpenterAddOn({
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
            .version(KubernetesVersion.V1_28)
            .account("123567891")
            .region("us-west-1")
            .addOns(
                new blueprints.KarpenterAddOn({
                    version: "v0.31.0",
                    nodePoolSpec: {
                        requirements: defaultReq
                    },
                    ec2NodeClassSpec: {
                        amiFamily: "AL2",
                        subnetSelector: {
                            "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1",
                        },
                        securityGroupSelector: {
                            "kubernetes.io/cluster/blueprint-construct-dev": "owned",
                        },
                        blockDeviceMappings: [blockDeviceMapping] 
                    }
            })
          )
          .buildAsync(app, "stack-with-values-overrides-blockdevicemapping");
    
        const template = Template.fromStack(stack);
        const karpenterResources = template.findResources("Custom::AWSCDK-EKS-KubernetesResource");
        const nodeClass = Object.values(karpenterResources).find((karpenterResource) => {
            if (karpenterResource?.Properties?.Manifest) {
                const manifest = karpenterResource.Properties.Manifest;
                if (typeof manifest === "string" && manifest.includes('"kind":"AWSNodeTemplate"')) { 
                    return true;
                }
            }
            return false;
        });
        const manifest = JSON.parse(nodeClass?.Properties?.Manifest)[0];
        expect(manifest.kind).toEqual('AWSNodeTemplate');
        expect(manifest.spec.blockDeviceMappings).toBeDefined();
        expect(manifest.spec.blockDeviceMappings.length).toEqual(1);
        expect(manifest.spec.blockDeviceMappings[0]).toMatchObject(blockDeviceMapping);
      });

      test("Stack creates custom resource definitions for Karpenter version from 0.32", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();
        const stack = blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.V1_28)
            .addOns(new blueprints.KarpenterAddOn({
                version: "v0.32.0",
                installCRDs: true,
                nodePoolSpec: {
                    requirements: defaultReq,
                    disruption: {
                        consolidationPolicy: "WhenEmpty",
                        consolidateAfter: "20m",
                        expireAfter: "20m",
                    }
                },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }))
            .build(app, 'install-0-32-check-for-crds');
            
            const template = Template.fromStack(stack);
            const karpenterResources = template.findResources("Custom::AWSCDK-EKS-KubernetesResource");

            // return in array of all the elements of karpenterResources that includes "kind":"CustomResourceDefinition"
            // and "group":"karpenter.sh" or "group":"karpenter.k8s.aws"
            // and "spec.Versions.Name = v1beta1"
            const crdManifests = Object.values(karpenterResources).filter(karpenterResource => {
                if (karpenterResource?.Properties?.Manifest) {
                    const manifest = karpenterResource.Properties.Manifest;
                    if (typeof manifest === "string" && manifest.includes('"kind":"CustomResourceDefinition"') &&
                                (manifest.includes('"group":"karpenter.sh"')
                                || manifest.includes('"group":"karpenter.k8s.aws"')
                                && manifest.includes('"name":"v1beta1"')
                                )) {
                                    return true;
                    }
                }
                return false;
            });
                
            expect(crdManifests).toBeDefined();
            // Expect there to be 3 karpenter crd manifests for v1beta1
            expect(crdManifests.length).toEqual(3);
      });
        
      test("Stack creation succeeded using KubernetesVersion.Of", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        
        
        blueprint.account("123567891").region('us-west-1')
            .version(KubernetesVersion.of('1.28'))
            .addOns(new blueprints.KarpenterAddOn({
                version: 'v0.30.2'
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        const stack = blueprint.build(app, 'stack-with-non-supporting-kubernetes-version');

        const template = Template.fromStack(stack);
        template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
        Chart: "karpenter",
        });
        const karpenter = template.findResources("Custom::AWSCDK-EKS-HelmChart");
        const properties = Object.values(karpenter).pop();
        const values = properties?.Properties?.Values;
        expect(values).toBeDefined();
    });
});
