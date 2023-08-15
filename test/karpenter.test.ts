import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { JupyterHubServiceType } from '../lib';

describe('Unit tests for JupyterHub addon', () => {

    test("Stack creation fails due to no EBS CSI add-on", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
<<<<<<< HEAD
            .addOns(new blueprints.KarpenterAddOn(), new blueprints.ClusterAutoScalerAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-addons');
        }).toThrow("Deploying stack-with-conflicting-addons failed due to conflicting add-on: KarpenterAddOn.");
    });

    test("Stack creation fails due to conflicting Karpenter prop for version under 0.16", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KarpenterAddOn({
                version: "0.15.0",
                weight: 30
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-karpenter-props');
        }).toThrow("The prop weight is only supported on versions v0.16.0 and later.");
    });

    test("Stack creation fails due to conflicting Karpenter prop for version under 0.15", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(new blueprints.KarpenterAddOn({
                version: "0.14.0",
                consolidation: { enabled: true },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-karpenter-props');
        }).toThrow("The prop consolidation is only supported on versions v0.15.0 and later.");
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

  test("Stack creation succeeds with custom values overrides", async () => {
    const app = new cdk.App();

    const blueprint = blueprints.EksBlueprint.builder();

    const stack = await blueprint
      .version("auto")
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

    test("Stack creates with interruption enabled", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-1')
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
    })
});
=======
            .addOns(
                new blueprints.AwsLoadBalancerControllerAddOn,
                new blueprints.JupyterHubAddOn({
                ebsConfig: {
                    storageClass: "gp2",
                    capacity: "4Gi",
                },
<<<<<<< HEAD
                serviceType: JupyterHubServiceType.CLUSTERIP,
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));
=======
            });
        }).toThrow("Template has 0 resources with type AWS::SQS::Queue.");
    });
>>>>>>> 31463a07 (fixing Karpenter interruption queue issue, with tests added)
});
>>>>>>> 1a24a266 (lint fix)

        expect(()=> {
            blueprint.build(app, 'stack-with-no-ebs-csi-addon');
        }).toThrow("Missing a dependency: EbsCsiDriverAddOn. Please add it to your list of addons.");
    });

    test("Stack creation fails due to no EFS CSI add-on", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(
                new blueprints.AwsLoadBalancerControllerAddOn,
                new blueprints.JupyterHubAddOn({
                efsConfig: {
                    pvcName: "efs-persist",
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                    capacity: '100Gi',
                },
                serviceType: JupyterHubServiceType.CLUSTERIP,
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-no-efs-csi-addon');
        }).toThrow("Missing a dependency: EfsCsiDriverAddOn. Please add it to your list of addons.");
    });
>>>>>>> 5d9468bb (PR Fixes)

    test("Stack creation fails due to no AWS Load Balancer Controller add-on when using ALB", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(
                new blueprints.EfsCsiDriverAddOn,
                new blueprints.JupyterHubAddOn({
                efsConfig: {
                    pvcName: "efs-persist",
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                    capacity: '100Gi',
                },
                serviceType: JupyterHubServiceType.ALB,
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-no-aws-load-balancer-controller-addon');
        }).toThrow("Missing a dependency: AwsLoadBalancerControllerAddOn. Please add it to your list of addons.");
    });

    test("Stack creation fails due to no AWS Load Balancer Controller add-on when using NLB", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .version("auto")
            .addOns(
                new blueprints.EfsCsiDriverAddOn,
                new blueprints.JupyterHubAddOn({
                efsConfig: {
                    pvcName: "efs-persist",
                    removalPolicy: cdk.RemovalPolicy.DESTROY,
                    capacity: '100Gi',
                },
                serviceType: JupyterHubServiceType.NLB,
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-no-aws-load-balancer-controller-addon');
        }).toThrow("Missing a dependency: AwsLoadBalancerControllerAddOn. Please add it to your list of addons.");
    });
});