import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { IstioBaseAddOn, KNativeOperator } from "../lib";

test("Generic cluster with kNative Eventing deployment", async () => {
    const app = new cdk.App();

    const blueprint = await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-east-1')
        .addOns(
            new IstioBaseAddOn(),
            new KNativeOperator(),
        )
        .buildAsync(app, 'knative-stack');

    expect(blueprint).toBeDefined();
});