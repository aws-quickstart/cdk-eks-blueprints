import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

const backstageAddOnProps = {
    namespace: "test-namespace",
    subdomain: "test-subdomain",
    certificateResourceName: "test-certificate",
    imageRegistry: "test-registry",
    imageRepository: "test-repository",
    imageTag: "test-tag",
    databaseResourceName: "test-db",
    databaseSecretTargetName: "test-secret-name"
  } as blueprints.BackstageAddOnProps;

describe('Unit tests for Backstage addon', () => {
    
    test("Stack creation fails due to missing AwsLoadBalancerControllerAddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.ExternalsSecretsAddOn)
            .addOns(new blueprints.BackstageAddOn(backstageAddOnProps))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'backstage-missing-dependency-lb-controller');
        }).toThrow("Missing a dependency for AwsLoadBalancerControllerAddOn");
    });

    test("Stack creation fails due to missing ExternalsSecretsAddOn", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.AwsLoadBalancerControllerAddOn)
            .addOns(new blueprints.BackstageAddOn(backstageAddOnProps))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'backstage-missing-dependency-external-secret');
        }).toThrow("Missing a dependency for ExternalsSecretsAddOn");
    });

    test("Stack creation fails due to database resource not found", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.ExternalsSecretsAddOn)
            .addOns(new blueprints.AwsLoadBalancerControllerAddOn)
            .addOns(new blueprints.BackstageAddOn(backstageAddOnProps))
            .teams(new blueprints.PlatformTeam({ name: 'platform' }));

        expect(()=> {
            blueprint.build(app, 'backstage-database-resource-not-found');
        }).toThrow("Required resource "+backstageAddOnProps.databaseResourceName+" is missing.");
    });
});
