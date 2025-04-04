import { Duration, Names, CfnOutput } from "aws-cdk-lib";
import { Rule } from "aws-cdk-lib/aws-events";
import { SqsQueue } from "aws-cdk-lib/aws-events-targets";
import { Cluster, IpFamily } from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { merge } from "ts-deepmerge";
import * as utils from "../../utils";
import { ClusterInfo } from "../../spi";
import * as semver from "semver";
import * as assert from "assert";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { KarpenterControllerPolicyV1 } from "./iam";
import { Ec2NodeClassV1Spec, NodePoolV1Spec, KARPENTER, RELEASE } from "./types";
import * as md5 from "ts-md5";

const defaultProps: HelmAddOnProps = {
    name: KARPENTER,
    namespace: "kube-system",
    version: "1.3.0",
    chart: KARPENTER,
    release: KARPENTER,
    repository: "oci://public.ecr.aws/karpenter/karpenter",
};

/**
 * Configuration options for the add-on
 */
export interface KarpenterV1AddOnProps extends HelmAddOnUserProps {
    /**
     * This is the top level nodepool specification. Nodepools launch nodes in response to pods that are unschedulable.
     * A single nodepool is capable of managing a diverse set of nodes.
     * Node properties are determined from a combination of nodepool and pod scheduling constraints.
     */
    nodePoolSpec?: NodePoolV1Spec;

    /**
     * This is the top level spec for the AWS Karpenter Provider
     * It contains configuration necessary to launch instances in AWS.
     */
    ec2NodeClassSpec?: Ec2NodeClassV1Spec;

    /**
     * Flag for enabling Karpenter's native interruption handling
     */
    interruptionHandling?: boolean;

    /**
     * Timeout duration while installing karpenter helm chart using addHelmChart API
     */
    helmChartTimeout?: Duration;

    /**
     * Use Pod Identity.
     * To use EKS Pod Identities
     *  - The cluster must have Kubernetes version 1.24 or later
     *  - Karpenter Pods must be assigned to Linux Amazon EC2 instances
     *  - Karpenter version supports Pod Identity (v0.35.0 or later) see https://docs.aws.amazon.com/eks/latest/userguide/pod-identity.html
     *
     * @see https://docs.aws.amazon.com/eks/latest/userguide/pod-identity.html
     *
     * @default false
     */
    podIdentity?: boolean;
}

/**
 * Implementation of the Karpenter add-on
 */
@utils.supportsALL
export class KarpenterV1AddOn extends HelmAddOn {
    readonly options: KarpenterV1AddOnProps;

    constructor(props?: KarpenterV1AddOnProps) {
        super({ ...defaultProps, ...props });
        this.options = this.props;
    }

    @utils.conflictsWith("ClusterAutoScalerAddOn")
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        assert(
            clusterInfo.cluster instanceof Cluster,
            "KarpenterAddOn cannot be used with imported clusters as it requires changes to the cluster authentication."
        );
        assert(
            semver.gte(this.options.version!, "0.32.0"),
            `Karpenter interruption handling requires version >= 0.32.0. Current version: ${this.props.version}`
        );

        assert(
            semver.gte(semver.coerce(clusterInfo.version.version)!, "1.29.0", true),
            `Cluster version must be >= 1.29 for Karpenter interruption handling. Current version: ${clusterInfo.version.version}`
        );
        const cluster: Cluster = clusterInfo.cluster;
        const endpoint = cluster.clusterEndpoint;
        const name = cluster.clusterName;
        const partition = cluster.stack.partition;

        const stackName = cluster.stack.stackName;
        const region = cluster.stack.region;

        let values = this.options.values ?? {};

        const interruption = this.options.interruptionHandling || false;
        const podIdentity = this.options.podIdentity || false;

        // NodePool variables
        const labels = this.options.nodePoolSpec?.labels || {};
        const annotations = this.options.nodePoolSpec?.annotations || {};
        const taints = this.options.nodePoolSpec?.taints || [];
        const startupTaints = this.options.nodePoolSpec?.startupTaints || [];
        const requirements = this.options.nodePoolSpec?.requirements || [];
        const disruption = this.options.nodePoolSpec?.disruption || null;
        const limits = this.options.nodePoolSpec?.limits || null;
        const weight = this.options.nodePoolSpec?.weight || null;

        // NodeClass variables

        const subnetSelectorTerms = this.options.ec2NodeClassSpec?.subnetSelectorTerms;
        const sgSelectorTerms = this.options.ec2NodeClassSpec?.securityGroupSelectorTerms;
        const amiFamily = this.options.ec2NodeClassSpec?.amiFamily;

        const amiSelectorTerms = this.options.ec2NodeClassSpec?.amiSelectorTerms;
        const instanceStorePolicy = this.options.ec2NodeClassSpec?.instanceStorePolicy || undefined;
        const userData = this.options.ec2NodeClassSpec?.userData || "";
        const instanceProf = this.options.ec2NodeClassSpec?.instanceProfile;
        const tags = this.options.ec2NodeClassSpec?.tags || {};
        const metadataOptions = this.options.ec2NodeClassSpec?.metadataOptions || {
            httpEndpoint: "enabled",
            httpProtocolIPv6: "disabled",
            httpPutResponseHopLimit: 2,
            httpTokens: "required",
        };

        if (cluster.ipFamily == IpFamily.IP_V6) {
            metadataOptions.httpProtocolIPv6 = "enabled";
        }
        const blockDeviceMappings = this.options.ec2NodeClassSpec?.blockDeviceMappings || [];
        const detailedMonitoring = this.options.ec2NodeClassSpec?.detailedMonitoring || false;

        // Set up the node role and instance profile
        const [karpenterNodeRole] = this.setUpNodeRole(cluster, stackName, region);

        // Create the controller policy
        let karpenterPolicyDocument;

        karpenterPolicyDocument = iam.PolicyDocument.fromJson(
            KarpenterControllerPolicyV1(cluster, partition, region)
        );

        karpenterPolicyDocument.addStatements(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ["iam:PassRole"],
                resources: [`${karpenterNodeRole.roleArn}`],
            })
        );

        // Support for Native spot interruption
        if (interruption) {
            // Add policy to the node role to allow access to the Interruption Queue
            const interruptionQueueStatement = this.createInterruptionQueue(cluster, stackName);
            karpenterPolicyDocument.addStatements(interruptionQueueStatement);
        }

        // Create Namespace
        const ns = utils.createNamespace(this.options.namespace!, cluster, true, true);

        let sa: any;
        let saAnnotation: any;
        if (podIdentity) {
            sa = utils.podIdentityAssociation(
                cluster,
                RELEASE,
                this.options.namespace!,
                karpenterPolicyDocument
            );
            saAnnotation = {};
        } else {
            sa = utils.createServiceAccount(
                cluster,
                RELEASE,
                this.options.namespace!,
                karpenterPolicyDocument
            );
            saAnnotation = { "eks.amazonaws.com/role-arn": sa.role.roleArn };
        }
        sa.node.addDependency(ns);

        // Create global helm values based on v1beta1 migration as shown below:
        // https://karpenter.sh/v0.32/upgrading/v1beta1-migration/#helm-values
        let globalSettings = { clusterName: name, clusterEndpoint: endpoint };

        globalSettings = merge(globalSettings, { interruptionQueue: interruption ? stackName : "" });

        utils.setPath(values, "settings", merge(globalSettings, values?.settings ?? {}));

        // Let Helm create the service account if using pod identity
        const saValues = {
            serviceAccount: { create: podIdentity, name: RELEASE, annotations: saAnnotation },
        };

        values = merge(values, saValues);
        // Install HelmChart using user defined value or default of 5 minutes.
        const helmChartTimeout = this.options.helmChartTimeout || Duration.minutes(5);
        const karpenterChart = this.addHelmChart(clusterInfo, values, false, true, helmChartTimeout);

        karpenterChart.node.addDependency(sa);

        if (clusterInfo.nodeGroups) {
            clusterInfo.nodeGroups.forEach((n) => karpenterChart.node.addDependency(n));
        }

        // Deploy Provisioner (Alpha) or NodePool (Beta) CRD based on the Karpenter Version
        if (this.options.nodePoolSpec) {
            const pool = {
              apiVersion: "karpenter.sh/v1",
              kind: "NodePool",
              metadata: {name: "default-nodepool"},
              spec: {
                template: {
                  metadata: {labels: labels, annotations: annotations},
                  spec: {
                    nodeClassRef: {
                        name: "default-ec2nodeclass",
                        group: "karpenter.k8s.aws",
                        kind: "EC2NodeClass"
                    },
                    taints: taints,
                    startupTaints: startupTaints,
                    requirements: this.convert(requirements),
                    expireAfter: this.options.nodePoolSpec?.expireAfter
                  },
                },
                disruption: disruption,
                limits: limits,
                weight: weight,
              },
            };

            const poolManifest = cluster.addManifest("default-pool", pool);
            poolManifest.node.addDependency(karpenterChart);

            // Deploy AWSNodeTemplate (Alpha) or EC2NodeClass (Beta) CRD based on the Karpenter Version
            if (this.options.ec2NodeClassSpec) {
                let ec2Node;

                ec2Node = {
                    apiVersion: "karpenter.k8s.aws/v1",
                    kind: "EC2NodeClass",
                    metadata: { name: "default-ec2nodeclass" },
                    spec: {
                        amiFamily: amiFamily,
                        subnetSelectorTerms: subnetSelectorTerms,
                        securityGroupSelectorTerms: sgSelectorTerms,
                        amiSelectorTerms: amiSelectorTerms ? amiSelectorTerms : [],
                        userData: userData,
                        tags: tags,
                        metadataOptions: metadataOptions,
                        blockDeviceMappings: blockDeviceMappings,
                        detailedMonitoring: detailedMonitoring,
                    },
                };

                // Provide custom Instance Profile to replace role if provided, else use the role created with the addon
                if (instanceProf) {
                    ec2Node = merge(ec2Node, { spec: { instanceProfile: instanceProf } });
                } else {
                    ec2Node = merge(ec2Node, { spec: { role: karpenterNodeRole.roleName } });
                }

                // Instance Store Policy added for v0.34.0 and up
                if (instanceStorePolicy) {
                    ec2Node = merge(ec2Node, { spec: { instanceStorePolicy: instanceStorePolicy } });
                }

                const nodeManifest = cluster.addManifest("default-node-template", ec2Node);
                poolManifest.node.addDependency(nodeManifest);
            }
        }

        return Promise.resolve(karpenterChart);
    }

    /**
     * Helper function to convert a key-pair values (with an operator)
     * of spec configurations to appropriate json format for addManifest function
     * @param reqs
     * @returns newReqs
     * */
    protected convert(reqs: { key: string; operator: string; values: string[] }[]): any[] {
        const newReqs = [];
        for (let req of reqs) {
            const key = req["key"];
            const op = req["operator"];
            const val = req["values"];
            const requirement = { key: key, operator: op, values: val };
            newReqs.push(requirement);
        }
        return newReqs;
    }

    /**
     * Helper function to set up the Karpenter Node Role and Instance Profile
     * Outputs to CloudFormation and map the role to the aws-auth ConfigMap
     * @param cluster EKS Cluster
     * @param stackName Name of the stack
     * @param region Region of the stack
     * @returns [karpenterNodeRole, karpenterInstanceProfile]
     */
    private setUpNodeRole(
        cluster: Cluster,
        stackName: string,
        region: string
    ): [iam.Role, iam.CfnInstanceProfile] {
        // Set up Node Role
        const karpenterNodeRole = new iam.Role(cluster, "karpenter-node-role", {
            assumedBy: new iam.ServicePrincipal(`ec2.${cluster.stack.urlSuffix}`),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKSWorkerNodePolicy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEKS_CNI_Policy"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
                iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
            ],
            //roleName: `KarpenterNodeRole-${name}` // let role name to be generated as unique
        });

        // Attach ipv6 related policies based on cluster IPFamily
        if (cluster.ipFamily === IpFamily.IP_V6) {
            const nodeIpv6Policy = new iam.Policy(cluster, "karpenter-node-Ipv6-Policy", {
                document: utils.getEKSNodeIpv6PolicyDocument(),
            });
            karpenterNodeRole.attachInlinePolicy(nodeIpv6Policy);
        }

        // Set up Instance Profile
        const instanceProfileName = md5.Md5.hashStr(stackName + region);
        const karpenterInstanceProfile = new iam.CfnInstanceProfile(
            cluster,
            "karpenter-instance-profile",
            {
                roles: [karpenterNodeRole.roleName],
                instanceProfileName: `KarpenterNodeInstanceProfile-${instanceProfileName}`,
                path: "/",
            }
        );
        karpenterInstanceProfile.node.addDependency(karpenterNodeRole);

        const clusterId = Names.uniqueId(cluster);

        //Cfn output for Node Role in case of needing to add additional policies
        new CfnOutput(cluster.stack, "Karpenter Instance Node Role", {
            value: karpenterNodeRole.roleName,
            description: "Karpenter add-on Node Role name",
            exportName: clusterId + "KarpenterNodeRoleName",
        });
        //Cfn output for Instance Profile for creating additional provisioners
        new CfnOutput(cluster.stack, "Karpenter Instance Profile name", {
            value: karpenterInstanceProfile ? karpenterInstanceProfile.instanceProfileName! : "none",
            description: "Karpenter add-on Instance Profile name",
            exportName: clusterId + "KarpenterInstanceProfileName",
        });

        // Map Node Role to aws-auth
        cluster.awsAuth.addRoleMapping(karpenterNodeRole, {
            groups: ["system:bootstrapper", "system:nodes"],
            username: "system:node:{{EC2PrivateDNSName}}",
        });

        return [karpenterNodeRole, karpenterInstanceProfile];
    }

    private createInterruptionQueue(cluster: Cluster, stackName: string): iam.PolicyStatement {
        // Create Interruption Queue
        const queue = new sqs.Queue(cluster.stack, "karpenter-queue", {
            queueName: stackName,
            retentionPeriod: Duration.seconds(300),
        });

        queue.addToResourcePolicy(
            new iam.PolicyStatement({
                sid: "EC2InterruptionPolicy",
                effect: iam.Effect.ALLOW,
                principals: [
                    new iam.ServicePrincipal("sqs.amazonaws.com"),
                    new iam.ServicePrincipal("events.amazonaws.com"),
                ],
                actions: ["sqs:SendMessage"],
                resources: [`${queue.queueArn}`],
            })
        );

        // Add Interruption Rules
        new Rule(cluster.stack, "schedule-change-rule", {
            eventPattern: { source: ["aws.health"], detailType: ["AWS Health Event"] },
        }).addTarget(new SqsQueue(queue));

        new Rule(cluster.stack, "spot-interruption-rule", {
            eventPattern: { source: ["aws.ec2"], detailType: ["EC2 Spot Instance Interruption Warning"] },
        }).addTarget(new SqsQueue(queue));

        new Rule(cluster.stack, "rebalance-rule", {
            eventPattern: { source: ["aws.ec2"], detailType: ["EC2 Instance Rebalance Recommendation"] },
        }).addTarget(new SqsQueue(queue));

        new Rule(cluster.stack, "inst-state-change-rule", {
            eventPattern: { source: ["aws.ec2"], detailType: ["C2 Instance State-change Notification"] },
        }).addTarget(new SqsQueue(queue));

        // Create and return the interruption queue policy statement
        return new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                "sqs:DeleteMessage",
                "sqs:GetQueueUrl",
                "sqs:GetQueueAttributes",
                "sqs:ReceiveMessage",
            ],
            resources: [`${queue.queueArn}`],
        });
    }
}
