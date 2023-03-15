import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { JupyterHubServiceType } from '../lib';

describe('Unit tests for JupyterHub addon', () => {

    test("Stack creation fails due to no EBS CSI add-on", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(
                new blueprints.AwsLoadBalancerControllerAddOn,
                new blueprints.JupyterHubAddOn({
                ebsConfig: {
                    storageClass: "gp2",
                    capacity: "4Gi",
                },
                serviceType: JupyterHubServiceType.CLUSTERIP,
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-no-ebs-csi-addon');
        }).toThrow("Missing a dependency: EbsCsiDriverAddOn. Please add it to your list of addons.");
    });

    test("Stack creation fails due to no EFS CSI add-on", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
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

    test("Stack creation fails due to no AWS Load Balancer Controller add-on when using ALB", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
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

