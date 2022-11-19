import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { IstioBaseAddOn, IstioControlPlaneAddOn, KNativeOperator } from "../lib";

test("Generic cluster with kNative Eventing deployment", async () => {
    const app = new cdk.App();

    const addons = [
        new IstioBaseAddOn(),
        new IstioControlPlaneAddOn(),
        new KNativeOperator(),
    ];

    const blueprint = await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-east-1')
        .addOns(...addons)
        .build(app, 'knative-stack');

    expect(blueprint).toBeDefined();
});