import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

describe('Unit tests for AMP addon', () => {
    
    test("Stack creation succeeds", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
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
        .build(app, 'amp-addon-stack-succeeds');

        expect(blueprint).toBeDefined();
    });

    test("Stack creation fails due to missing AdotCollectorAddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
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
        );

        expect(()=> {
            blueprint.build(app, "amp-missing-adot");
        }).toThrow("Missing a dependency for AdotCollectorAddOn");
    });

    test("Stack creation fails due to ruleFilePaths.length == 0", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
        .addOns(new blueprints.addons.AwsLoadBalancerControllerAddOn())
        .addOns(new blueprints.addons.CertManagerAddOn())
        .addOns(new blueprints.addons.AdotCollectorAddOn())
        .addOns(
            new blueprints.addons.AmpAddOn({
                ampPrometheusEndpoint: "test",
                ampRules: {
                    ampWorkspaceArn: "test",
                    ruleFilePaths: []
                }
            })
        );

        expect(()=> {
            blueprint.build(app, "amp-missing-rules");
        }).toThrow("No paths defined for AMP rules");    
    });
});
