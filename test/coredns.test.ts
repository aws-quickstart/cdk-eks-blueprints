import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as blueprints from '../lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks-v2';

test("Coredns Addon deploying correct default version of Addon for 1.35", async () => {
    const app = new cdk.App();

    const stack = await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_35)
        .addOns(new blueprints.CoreDnsAddOn("auto"))
        .buildAsync(app, "coredns-stack-001");

    Template.fromStack(stack).hasResourceProperties("AWS::EKS::Addon", {
        AddonName: "coredns",
        AddonVersion: "v1.13.2-eksbuild.3",
    });
});
