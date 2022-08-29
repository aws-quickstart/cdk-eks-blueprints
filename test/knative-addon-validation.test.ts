import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { KNativeEventingAddOn } from "../lib";

test("Generic cluster with kNative Eventing deployment", async () => {
    const app = new cdk.App();

    const blueprint = await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-east-1')
        .addOns(
            new KNativeEventingAddOn(),
        )
        .buildAsync(app, 'knative-stack');

    expect(blueprint).toBeDefined();
});