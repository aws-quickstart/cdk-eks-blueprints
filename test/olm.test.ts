import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

describe('Unit tests for OLM addon', () => {

    test("Stack creation succeeds", () => {
        const app = new cdk.App();

        const blueprint = blueprints.EksBlueprint.builder();

        blueprint.account("123567891").region('us-west-1')
            .addOns(new blueprints.OlmAddOn())
            .build(app, 'olm-stack-succeeds');

        expect(blueprint).toBeDefined();
    });
});
