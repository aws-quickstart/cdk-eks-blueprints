import * as cdk from "aws-cdk-lib";
import * as blueprints from "../lib";

import { AssertionError } from "assert";
import { Template } from "aws-cdk-lib/assertions";

const stackName = "stack-test";

const region = "us-west-1";
const account = "123567891";
const clusterVersion: "auto" | cdk.aws_eks.KubernetesVersion = "auto";

describe("Unit tests for ServiceAckAddOn", () => {
    describe("Stack creation", () => {
        describe("ServiceAckAddOn that does not support ARM architectures", () => {
            describe("MemoryDB", () => {
                const chartName = blueprints.serviceMappings[blueprints.AckServiceName.MEMORYDB]?.chart;
                test("ARM", async () => {
                    const app = new cdk.App();

                    const builder = new blueprints.GravitonBuilder();
                    try {
                        const stack = await builder
                            .account(account)
                            .region(region)
                            .version(clusterVersion)
                            .addOns(new blueprints.addons.MemoryDBAckAddOn())
                            .buildAsync(app, stackName);
                        expect(stack).toBeUndefined();
                    } catch (error) {
                        expect(error).toBeInstanceOf(Error);
                    }
                });
                test("X86", async () => {
                    const app = new cdk.App();

                    const builder = blueprints.EksBlueprint.builder();
                    const stack = await builder
                        .account(account)
                        .region(region)
                        .version(clusterVersion)
                        .addOns(new blueprints.addons.MemoryDBAckAddOn())
                        .buildAsync(app, stackName);
                    expect(stack).toBeDefined();

                    Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                        Chart: chartName
                    });
                });
            });
        });
        describe("ServiceAckAddOn that supports all architectures", () => {
            describe("S3", () => {
                const chartName = blueprints.serviceMappings[blueprints.AckServiceName.S3]?.chart;
                test("ARM", async () => {
                    const app = new cdk.App();

                    const builder = new blueprints.GravitonBuilder();
                    const stack = await builder
                        .account(account)
                        .region(region)
                        .version(clusterVersion)
                        .addOns(new blueprints.addons.S3AckAddOn())
                        .buildAsync(app, stackName);
                    expect(stack).toBeDefined();

                    Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                        Chart: chartName
                    });
                });
                test("X86", async () => {
                    const app = new cdk.App();

                    const builder = blueprints.EksBlueprint.builder();
                    const stack = await builder
                        .account(account)
                        .region(region)
                        .version(clusterVersion)
                        .addOns(new blueprints.addons.S3AckAddOn())
                        .buildAsync(app, stackName);
                    expect(stack).toBeDefined();

                    Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                        Chart: chartName
                    });
                });
            });
        });
    });
});