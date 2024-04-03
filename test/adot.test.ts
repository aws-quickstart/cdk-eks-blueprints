import * as cdk from "aws-cdk-lib";
import * as blueprints from "../lib";

import { AssertionError } from "assert";
import { Match, Template } from "aws-cdk-lib/assertions";

describe("Unit tests for ADOT addon", () => {
    const region = "us-west-1";
    const account = "123567891";
    const clusterVersion: "auto" | cdk.aws_eks.KubernetesVersion = "auto";

    describe("Stack creation", () => {
        test("fails", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();

            try {
                const stack = await blueprint
                    .account(account)
                    .region(region)
                    .version(clusterVersion)
                    .addOns(new blueprints.addons.AdotCollectorAddOn())
                    .buildAsync(app, "adot-addon-stack");

                expect(stack).toBeUndefined();
            } catch (error) {
                expect(error).toBeInstanceOf(AssertionError);
            }
        });

        test("succeeds", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn()
                )
                .buildAsync(app, "adot-addon-stack");
            expect(stack).toBeDefined();

            Template.fromStack(stack).hasResourceProperties("AWS::EKS::Addon", {
                AddonName: "adot",
            });
        });
    });

    describe("Set Addon Version", () => {
        test("Target Version", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();
            const addonVersion = "0.61.0";

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn({
                        version: addonVersion,
                    })
                )
                .buildAsync(app, "adot-addon-stack");
            expect(stack).toBeDefined();

            Template.fromStack(stack).hasResourceProperties("AWS::EKS::Addon", {
                AddonName: "adot",
                AddonVersion: addonVersion,
            });
        });

        test("Use auto version", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();
            const addonVersion = "auto";

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn({
                        version: addonVersion,
                    })
                )
                .buildAsync(app, "adot-addon-stack");
            expect(stack).toBeDefined();

            Template.fromStack(stack).hasResourceProperties("AWS::EKS::Addon", {
                AddonName: "adot",
                AddonVersion: Match.not(addonVersion),
            });
        });

        test("Use undefined version", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();
            const addonVersion = undefined;

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn({
                        version: addonVersion,
                    })
                )
                .buildAsync(app, "adot-addon-stack");
            expect(stack).toBeDefined();

            Template.fromStack(stack).hasResourceProperties("AWS::EKS::Addon", {
                AddonName: "adot",
                AddonVersion: Match.not(addonVersion),
            });
        });
    });

    describe("Namespace", () => {
        test("Namespace is set", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();
            const namespace = "adot-collector";

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn({
                        namespace,
                    })
                )
                .buildAsync(app, "adot-addon-stack");

            Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-KubernetesResource", {
                Manifest: Match.stringLikeRegexp(`.*"kind":"Namespace".*"metadata":{"name":"${namespace}",.*`),
                Overwrite: true,
            });
        });

        test("Namespace is not set", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();
            const namespace = "default";

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn()
                )
                .buildAsync(app, "adot-addon-stack");

            Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-KubernetesResource", {
                Manifest: Match.stringLikeRegexp(`.*"kind":"Namespace".*"metadata":{"name":"${namespace}",.*`),
                Overwrite: true,
            });
        });

        test("Namespace is undefined", async () => {
            const app = new cdk.App();

            const blueprint = blueprints.EksBlueprint.builder();
            const namespace = "default";

            const stack = await blueprint
                .account(account)
                .region(region)
                .version(clusterVersion)
                .addOns(
                    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
                    new blueprints.addons.CertManagerAddOn(),
                    new blueprints.addons.AdotCollectorAddOn({
                        namespace: undefined,
                    })
                )
                .buildAsync(app, "adot-addon-stack");

            Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-KubernetesResource", {
                Manifest: Match.stringLikeRegexp(`.*"kind":"Namespace".*"metadata":{"name":"${namespace}",.*`),
                Overwrite: true,
            });
        });
    });
});
