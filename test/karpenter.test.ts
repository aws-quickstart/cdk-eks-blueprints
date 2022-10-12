import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

describe('Unit tests for Karpenter addon', () => {

    test("Stack creation fails due to conflicting add-ons", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.VpcCniAddOn, new blueprints.KarpenterAddOn(), new blueprints.ClusterAutoScalerAddOn)
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-addons');
        }).toThrow("Deploying stack-with-conflicting-addons failed due to conflicting add-on: KarpenterAddOn.");
    });

    test("Stack creation fails due to conflicting Karpenter prop for version under 0.16", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.VpcCniAddOn, new blueprints.KarpenterAddOn({
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
            .addOns(new blueprints.VpcCniAddOn, new blueprints.KarpenterAddOn({
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
            .addOns(new blueprints.VpcCniAddOn, new blueprints.KarpenterAddOn({
                ttlSecondsAfterEmpty: 30,
                consolidation: { enabled: true },
            }))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'stack-with-conflicting-karpenter-props');
        }).toThrow("Consolidation and ttlSecondsAfterEmpty must be mutually exclusive.");
    });
});

