import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as blueprints from '../lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';

test("Coredns Addon deploying correct default version of Addon for 1.28", () => {
    const app = new cdk.App();

    const stack = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_28)
        .addOns(new blueprints.CoreDnsAddOn("auto"))
        .build(app, "coredns-stack-001");
});

test("Coredns Addon deploying correct default version of Addon for 1.27", () => {
    const app = new cdk.App();

    const stack = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_27)
        .addOns(new blueprints.CoreDnsAddOn("auto"))
        .build(app, "coredns-stack-002");
});

test("Coredns Addon deploying correct default version of Addon for 1.26", () => {
    const app = new cdk.App();

    const stack = blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_26)
        .addOns(new blueprints.CoreDnsAddOn("auto"))
        .build(app, "coredns-stack-003");
});