import * as cdk from "aws-cdk-lib";
import * as blueprints from "../lib";

import { AssertionError } from "assert";
import { Template } from "aws-cdk-lib/assertions";
import { AckServiceName } from "../lib";

const stackName = "stack-test";

const region = "us-west-1";
const account = "123567891";
const clusterVersion: "auto" | cdk.aws_eks.KubernetesVersion = "auto";

const serviceAddonSupportMapping: { [key in AckServiceName]: blueprints.AckAddOn } = {
    [AckServiceName.ACM]: new blueprints.ACMAckAddOn(),
    [AckServiceName.ACMPCA]: new blueprints.ACMPCAAckAddOn(),
    [AckServiceName.APIGATEWAYV2]: new blueprints.APIGatewayV2AckAddOn(),
    [AckServiceName.APPLICATIONAUTOSCALING]: new blueprints.ApplicationAutoScalingAckAddOn(),
    [AckServiceName.CLOUDTRAIL]: new blueprints.CloudtrailAckAddOn(),
    [AckServiceName.CLOUDWATCH]: new blueprints.CloudwatchAckAddOn(),
    [AckServiceName.CLOUDWATCHLOGS]: new blueprints.CloudwatchLogsAckAddOn(),
    [AckServiceName.DYNAMODB]: new blueprints.DynamoDBAckAddOn(),
    [AckServiceName.EC2]: new blueprints.EC2AckAddOn(),
    [AckServiceName.ECR]: new blueprints.ECRAckAddOn(),
    [AckServiceName.EKS]: new blueprints.EKSAckAddOn(),
    [AckServiceName.ELASTICACHE]: new blueprints.ElasticacheAckAddOn(),
    [AckServiceName.ELASTICSEARCHSERVICE]: new blueprints.ElasticSearchAckAddOn(),
    [AckServiceName.EMRCONTAINERS]: new blueprints.EMRContainersAckAddOn(),
    [AckServiceName.EVENTBRIDGE]: new blueprints.EventBridgeAckAddOn(),
    [AckServiceName.IAM]: new blueprints.IAMAckAddOn(),
    [AckServiceName.KAFKA]: new blueprints.KafkaAckAddOn(),
    [AckServiceName.KINESIS]: new blueprints.KinesisAckAddOn(),
    [AckServiceName.KMS]: new blueprints.KMSAckAddOn(),
    [AckServiceName.LAMBDA]: new blueprints.LambdaAckAddOn(),
    [AckServiceName.MEMORYDB]: new blueprints.MemoryDBAckAddOn(),
    [AckServiceName.MQ]: new blueprints.MQAckAddOn(),
    [AckServiceName.OPENSEARCHSERVICE]: new blueprints.OpensearchServiceAckAddOn(),
    [AckServiceName.PIPES]: new blueprints.PipesAckAddOn(),
    [AckServiceName.PROMETHEUSSERVICE]: new blueprints.PrometheusServiceAckAddOn(),
    [AckServiceName.RDS]: new blueprints.RDSAckAddOn(),
    [AckServiceName.ROUTE53]: new blueprints.Route53AckAddOn(),
    [AckServiceName.ROUTE53RESOLVER]: new blueprints.Route53ResolverAckAddOn(),
    [AckServiceName.S3]: new blueprints.S3AckAddOn(),
    [AckServiceName.SAGEMAKER]: new blueprints.SagemakerAckAddOn(),
    [AckServiceName.SECRETSMANAGER]: new blueprints.SecretsManagerAckAddOn(),
    [AckServiceName.SFN]: new blueprints.SFNAckAddOn(),
    [AckServiceName.SNS]: new blueprints.SNSAckAddOn(),
    [AckServiceName.SQS]: new blueprints.SQSAckAddOn(),
}

async function getStack(builder: blueprints.BlueprintBuilder, addons: blueprints.ClusterAddOn[]): Promise<blueprints.EksBlueprint> {
    const app = new cdk.App();
    return await builder.account(account)
        .region(region)
        .version(clusterVersion)
        .addOns(...addons)
        .buildAsync(app, stackName)
}

describe("Unit tests for ServiceAckAddOn", () => {
    describe("Stack creation", () => {
        let armBuilder: blueprints.BlueprintBuilder, x86Builder: blueprints.BlueprintBuilder;
        beforeEach(() => {
            armBuilder = new blueprints.GravitonBuilder();
            x86Builder = blueprints.EksBlueprint.builder();
        })
        for (const [service, addon] of Object.entries(serviceAddonSupportMapping)) {
            const chartName = blueprints.serviceMappings[service as AckServiceName]?.chart;
            // list of AckServiceNames which do not support ARM
            if (Object.values([
                AckServiceName.MEMORYDB
            ]).includes(service as AckServiceName)) {
                describe("ServiceAckAddOn that does not support ARM architectures: " + service, () => {
                    test("ARM", async () => {
                        try {
                            const stack = await getStack(armBuilder, [addon]);
                            expect(stack).toBeUndefined();
                        } catch (error) {
                            expect(error).toBeInstanceOf(Error);
                        }
                    });
                    test("X86", async () => {
                        const stack = await getStack(x86Builder, [addon]);
                        expect(stack).toBeDefined();

                        Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                            Chart: chartName
                        });
                    });
                });
            } else {
                describe("ServiceAckAddOn that supports all architectures: " + service, () => {
                    test("ARM", async () => {
                        const stack = await getStack(armBuilder, [addon]);
                        expect(stack).toBeDefined();

                        Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                            Chart: chartName
                        });
                    });
                    test("X86", async () => {
                        const stack = await getStack(x86Builder, [addon]);
                        expect(stack).toBeDefined();

                        Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                            Chart: chartName
                        });
                    });
                });
            }
        }
        describe("With mixed ServiceACKAddOns (ie 1 supports ARM, 1 does not", () => {
            const services = [
                AckServiceName.MEMORYDB,
                AckServiceName.S3
            ];
            // need more control over addons to avoid them both trying to create the namespace
            const addons = [
                new blueprints.MemoryDBAckAddOn({
                    createNamespace: true
                }),
                new blueprints.S3AckAddOn({
                    createNamespace: false
                }),
            ];
            const chartNames = services.map((service) => { return blueprints.serviceMappings[service as AckServiceName]?.chart });

            test("ARM", async () => {
                try {
                    const stack = await getStack(armBuilder, addons);
                    expect(stack).toBeUndefined();
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                }
            });
            test("X86", async () => {
                const stack = await getStack(x86Builder, addons);
                expect(stack).toBeDefined();

                chartNames.forEach((chartName) => {
                    Template.fromStack(stack).hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
                        Chart: chartName
                    });
                });
            });
        })
    });
});