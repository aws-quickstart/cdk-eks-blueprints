import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
    
test("Stack creation succeeds", async () => {
    const app = new cdk.App();

    const blueprint = blueprints.EksBlueprint.builder();

    const stack = await blueprint.account("123567891").region('us-west-1').version("auto")
    .addOns(new blueprints.addons.AwsLoadBalancerControllerAddOn())
    .addOns(new blueprints.addons.CertManagerAddOn())
    .addOns(new blueprints.addons.AdotCollectorAddOn())
    .addOns(
        new blueprints.addons.AmpAddOn({
            ampPrometheusEndpoint: "test",
            ampRules: {
                ampWorkspaceArn: "test",
                ruleFilePaths: [
                    __dirname + "/resources/recording-rules-test.yml",
                ]
            }
        })
    )
    .buildAsync(app, 'amp-addon-stack-succeeds');
    expect(stack).toBeDefined();
});

test("Stack creation fails due to ruleFilePaths.length == 0", async () => {
    const app = new cdk.App();

    const blueprint = blueprints.EksBlueprint.builder();

    blueprint.account("123567891").region('us-west-1').version("auto")
        .addOns(new blueprints.addons.AwsLoadBalancerControllerAddOn())
        .addOns(new blueprints.addons.CertManagerAddOn())
        .addOns(new blueprints.addons.AdotCollectorAddOn({
            namespace: "default",
            version: "v0.90.0-eksbuild.1",
        }))
        .addOns(
            new blueprints.addons.AmpAddOn({
                ampPrometheusEndpoint: "test",
                ampRules: {
                    ampWorkspaceArn: "test",
                    ruleFilePaths: []
                }
            })
        );

    try {
        const stack = await blueprint.buildAsync(app, "amp-missing-rules");
        expect(stack).toBeDefined();
    }
    catch (error){
        return;
    }
    fail("Expected exception wasnt thrown for AMP Addon-on Rule Path test.")      
});
