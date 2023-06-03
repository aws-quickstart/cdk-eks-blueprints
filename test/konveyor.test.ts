import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

describe('Unit tests for Konveyor addon', () => {

    test("Stack creation succeeds", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
        .addOns(
            new blueprints.AwsLoadBalancerControllerAddOn(),
            new blueprints.EbsCsiDriverAddOn(),
            new blueprints.OlmAddOn(),
            new blueprints.KonveyorAddOn()
        )
        .build(app, 'konveyor-stack-succeeds');

        expect(blueprint).toBeDefined();
    });

    test("Stack creation fails due to missing EbsCsiDriverAddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
        .addOns(
            new blueprints.AwsLoadBalancerControllerAddOn(),
            new blueprints.OlmAddOn(),
            new blueprints.KonveyorAddOn()
        );

        expect(()=> {
            blueprint.build(app, 'konveyor-missing-dependency-ebs-csi-driver');
        }).toThrow("Missing a dependency for EbsCsiDriverAddOn");
    });

    test("Stack creation fails due to missing OlmAddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
        .addOns(
            new blueprints.AwsLoadBalancerControllerAddOn(),
            new blueprints.EbsCsiDriverAddOn(),
            new blueprints.KonveyorAddOn()
        );

        expect(()=> {
            blueprint.build(app, 'konveyor-missing-dependency-olm');
        }).toThrow("Missing a dependency for OlmAddOn");
    });

    test("Stack creation fails due to missing AwsLoadBalancerControllerAddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
        .addOns(
            new blueprints.OlmAddOn(),
            new blueprints.EbsCsiDriverAddOn(),
            new blueprints.KonveyorAddOn()
        );

        expect(()=> {
            blueprint.build(app, 'konveyor-missing-dependency-lb');
        }).toThrow("Missing a dependency for AwsLoadBalancerControllerAddOn");
    });
});