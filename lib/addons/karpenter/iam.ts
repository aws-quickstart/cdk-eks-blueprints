import { CfnJson } from "aws-cdk-lib";
import { Cluster } from "aws-cdk-lib/aws-eks";

// IAM Policy for Alpha CRD Karpenter addons
export const KarpenterControllerPolicy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
            // Write Operations
                "ec2:CreateLaunchTemplate",
                "ec2:CreateFleet",
                "ec2:RunInstances",
                "ec2:CreateTags",
                "ec2:TerminateInstances",
                "ec2:DeleteLaunchTemplate",
            // Read Operations
                "ec2:DescribeLaunchTemplates",
                "ec2:DescribeInstances",
                "ec2:DescribeSecurityGroups",
                "ec2:DescribeSubnets",
                "ec2:DescribeImages",
                "ec2:DescribeInstanceTypes",
                "ec2:DescribeInstanceTypeOfferings",
                "ec2:DescribeAvailabilityZones",
                "ec2:DescribeSpotPriceHistory",
                "ssm:GetParameter",
                "pricing:GetProducts",
            ],
            "Resource": "*"
        }
    ]
};

/**
 * Builds the full (combined) scoped Karpenter controller policy document.
 *
 * This scoped policy is shared by the legacy v1beta1-generation addon and the stable-v1 addon
 * (`KarpenterV1AddOn`): the controller IAM permissions did not materially change between the
 * v1beta1 and stable-v1 CRD generations, so a single definition serves both.
 *
 * The document embeds the cluster name repeatedly in its tag-scoped conditions, so for clusters with
 * long names a single combined managed policy can exceed the IAM managed-policy size quota
 * (6,144 chars). To stay under the limit, callers can attach it as several scoped managed policies
 * via {@link KarpenterControllerPolicyV1Groups}, mirroring upstream Karpenter
 * (aws/karpenter-provider-aws#8690).
 */
const buildScopedKarpenterControllerPolicyDocument = (cluster: Cluster, partition: string, region: string) => {
    const condition1 = new CfnJson(cluster.stack, 'condition-owned-request-tag', {
        value: {
            [`aws:RequestTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned"
        },
    });
    const condition2 = new CfnJson(cluster.stack, 'condition-owned-resource-tag', {
        value: {
            [`aws:ResourceTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned"
        },
    });
    const condition3 = new CfnJson(cluster.stack, 'condition-owned-request-tag-topology', {
        value: {
            [`aws:RequestTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned",
            "aws:RequestTag/topology.kubernetes.io/region": `${region}`
        },
    });
    const condition4 = new CfnJson(cluster.stack, 'condition-request-resource-tags', {
        value: {
            [`aws:ResourceTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned",
            [`aws:RequestTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned",
            "aws:ResourceTag/topology.kubernetes.io/region": `${region}`,
            "aws:RequestTag/topology.kubernetes.io/region": `${region}`
        }
    });
    const condition5 = new CfnJson(cluster.stack, 'condition-owned-resource-tag-topology', {
        value: {
            [`aws:ResourceTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned",
            "aws:ResourceTag/topology.kubernetes.io/region": `${region}`
        }
    });
    const condition6 = new CfnJson(cluster.stack, 'condition-owned-cluster-tag-ec2-actions', {
        value: {
            [`aws:RequestTag/kubernetes.io/cluster/${cluster.clusterName}`]: "owned",
            "ec2:CreateAction": ["RunInstances", "CreateFleet", "CreateLaunchTemplate"]
        },
    });
    

    return {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "AllowScopedEC2InstanceActions",
                "Effect": "Allow",
                "Resource": [
                    `arn:${partition}:ec2:${region}::image/*`,
                    `arn:${partition}:ec2:${region}::snapshot/*`,
                    `arn:${partition}:ec2:${region}:*:spot-instances-request/*`,
                    `arn:${partition}:ec2:${region}:*:security-group/*`,
                    `arn:${partition}:ec2:${region}:*:subnet/*`,
                    `arn:${partition}:ec2:${region}:*:launch-template/*`
                ],
                "Action": [
                    "ec2:RunInstances",
                    "ec2:CreateFleet"
                ]
            },
            {
                "Sid": "AllowScopedEC2InstanceActionsWithTags",
                "Effect": "Allow",
                "Resource": [
                    `arn:${partition}:ec2:${region}:*:fleet/*`,
                    `arn:${partition}:ec2:${region}:*:instance/*`,
                    `arn:${partition}:ec2:${region}:*:volume/*`,
                    `arn:${partition}:ec2:${region}:*:network-interface/*`,
                    `arn:${partition}:ec2:${region}:*:launch-template/*`,
                    `arn:${partition}:ec2:${region}:*:spot-instances-request/*`
                ],
                "Action": [
                    "ec2:RunInstances",
                    "ec2:CreateFleet",
                    "ec2:CreateLaunchTemplate"
                ],
                "Condition": {
                    "StringEquals": condition1,
                    "StringLike": {
                        "aws:RequestTag/karpenter.sh/nodepool": "*"
                    }
                },
            },
            {
                "Sid": "AllowScopedResourceCreationTagging",
                "Effect": "Allow",
                "Resource": [
                    `arn:${partition}:ec2:${region}:*:fleet/*`,
                    `arn:${partition}:ec2:${region}:*:instance/*`,
                    `arn:${partition}:ec2:${region}:*:volume/*`,
                    `arn:${partition}:ec2:${region}:*:network-interface/*`,
                    `arn:${partition}:ec2:${region}:*:launch-template/*`,
                    `arn:${partition}:ec2:${region}:*:spot-instances-request/*`
                ],
                "Action": "ec2:CreateTags",
                "Condition": {
                    "StringEquals": condition6,
                    "StringLike": {
                        "aws:RequestTag/karpenter.sh/nodepool": "*"
                    }
                }
            },
            {
                "Sid": "AllowScopedResourceTagging",
                "Effect": "Allow",
                "Resource": `arn:${partition}:ec2:${region}:*:instance/*`,
                "Action": "ec2:CreateTags",
                "Condition": {
                    "StringEquals": condition2,
                    "StringLike": {
                        "aws:ResourceTag/karpenter.sh/nodepool": "*"
                    },
                    "ForAllValues:StringEquals": {
                        "aws:TagKeys": [
                            "karpenter.sh/nodeclaim",
                            "Name"
                        ]
                    }
                }
            },
            {
                "Sid": "AllowScopedDeletion",
                "Effect": "Allow",
                "Resource": [
                    `arn:${partition}:ec2:${region}:*:instance/*`,
                    `arn:${partition}:ec2:${region}:*:launch-template/*`
                ],
                "Action": [
                    "ec2:TerminateInstances",
                    "ec2:DeleteLaunchTemplate"
                ],
                "Condition": {
                    "StringEquals": condition2,
                    "StringLike": {
                        "aws:ResourceTag/karpenter.sh/nodepool": "*"
                    }
                }
            },
            {
                "Sid": "AllowRegionalReadActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "ec2:DescribeAvailabilityZones",
                    "ec2:DescribeCapacityReservations",
                    "ec2:DescribeImages",
                    "ec2:DescribeInstances",
                    "ec2:DescribeInstanceStatus",
                    "ec2:DescribeInstanceTypeOfferings",
                    "ec2:DescribeInstanceTypes",
                    "ec2:DescribeLaunchTemplates",
                    "ec2:DescribePlacementGroups",
                    "ec2:DescribeSecurityGroups",
                    "ec2:DescribeSpotPriceHistory",
                    "ec2:DescribeSubnets"
                ],
                "Condition": {
                    "StringEquals": {
                        "aws:RequestedRegion": `${region}`
                    }
                }
            },
            {
                "Sid": "AllowSSMReadActions",
                "Effect": "Allow",
                "Resource": `arn:${partition}:ssm:${region}::parameter/aws/service/*`,
                "Action": "ssm:GetParameter"
            },
            {
                "Sid": "AllowPricingReadActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": "pricing:GetProducts"
            },
            {
                "Sid": "AllowScopedInstanceProfileCreationActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:CreateInstanceProfile"
                ],
                "Condition": {
                    "StringEquals": condition3,
                    "StringLike": {
                        "aws:RequestTag/karpenter.k8s.aws/ec2nodeclass": "*"
                    }
                }
            },
            {
                "Sid": "AllowScopedInstanceProfileTagActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:TagInstanceProfile"
                ],
                "Condition": {
                    "StringEquals": condition4,
                    "StringLike": {
                        "aws:ResourceTag/karpenter.k8s.aws/ec2nodeclass": "*",
                        "aws:RequestTag/karpenter.k8s.aws/ec2nodeclass": "*"
                    }
                }
            },
            {
                "Sid": "AllowScopedInstanceProfileActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:AddRoleToInstanceProfile",
                    "iam:RemoveRoleFromInstanceProfile",
                    "iam:DeleteInstanceProfile"
                ],
                "Condition": {
                    "StringEquals": condition5,
                    "StringLike": {
                        "aws:ResourceTag/karpenter.k8s.aws/ec2nodeclass": "*"
                    }
                }
            },
            {
                "Sid": "AllowInstanceProfileReadActions",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "iam:GetInstanceProfile", 
                    "iam:ListInstanceProfiles"
                ]
            },
            {
                "Sid": "AllowAPIServerEndpointDiscovery",
                "Effect": "Allow",
                "Resource": `${cluster.clusterArn}`,
                "Action": "eks:DescribeCluster"
            },
            {
                "Sid": "AllowZonalShiftStatusReadOnly",
                "Effect": "Allow",
                "Resource": "*",
                "Action": [
                    "arc-zonal-shift:GetManagedResource"
                ],
                "Condition": {
                    "StringEquals": {
                        "arc-zonal-shift:ResourceIdentifier": `${cluster.clusterArn}`
                    }
                }
            }
        ]
    };
};

/**
 * Sids that make up each named controller policy, mirroring the policy split upstream Karpenter uses
 * (aws/karpenter-provider-aws#8690). The interruption-queue permissions are not listed here; the
 * addon adds them separately as their own policy, and only when interruption handling is enabled.
 */
const KARPENTER_CONTROLLER_POLICY_SIDS = {
    nodeLifecycle: [
        "AllowScopedEC2InstanceActions",
        "AllowScopedEC2InstanceActionsWithTags",
        "AllowScopedResourceCreationTagging",
        "AllowScopedResourceTagging",
        "AllowScopedDeletion",
    ],
    iamIntegration: [
        "AllowScopedInstanceProfileCreationActions",
        "AllowScopedInstanceProfileTagActions",
        "AllowScopedInstanceProfileActions",
        "AllowInstanceProfileReadActions",
    ],
    eksIntegration: [
        "AllowAPIServerEndpointDiscovery",
    ],
    resourceDiscovery: [
        "AllowRegionalReadActions",
        "AllowSSMReadActions",
        "AllowPricingReadActions",
    ],
    zonalShift: [
        "AllowZonalShiftStatusReadOnly",
    ],
} as const;

/** Names of the scoped Karpenter controller policies (mirrors upstream's policy names). */
export type KarpenterControllerPolicyName = keyof typeof KARPENTER_CONTROLLER_POLICY_SIDS;

/**
 * Scoped Karpenter controller policy as a single combined document. Introduced for the v1beta1 CRD
 * generation (hence the historical `Beta` name) and still used by the legacy `KarpenterAddOn`.
 */
export const KarpenterControllerPolicyBeta = (cluster: Cluster, partition: string, region: string) =>
    buildScopedKarpenterControllerPolicyDocument(cluster, partition, region);

/**
 * The same scoped controller policy, split into separate named documents — `nodeLifecycle`,
 * `iamIntegration`, `eksIntegration`, `resourceDiscovery`, and `zonalShift` — each meant to be
 * attached as its own managed policy. This keeps every managed policy under the IAM managed-policy
 * size quota even for clusters with long names (the cluster name is embedded repeatedly in the
 * tag-scoped conditions), mirroring upstream Karpenter (aws/karpenter-provider-aws#8690).
 */
export const KarpenterControllerPolicyV1Groups = (cluster: Cluster, partition: string, region: string): Record<KarpenterControllerPolicyName, object> => {
    const statements = buildScopedKarpenterControllerPolicyDocument(cluster, partition, region).Statement as any[];
    const documentFor = (sids: readonly string[]) => ({
        "Version": "2012-10-17",
        "Statement": statements.filter((statement) => sids.includes(statement.Sid)),
    });
    return {
        nodeLifecycle: documentFor(KARPENTER_CONTROLLER_POLICY_SIDS.nodeLifecycle),
        iamIntegration: documentFor(KARPENTER_CONTROLLER_POLICY_SIDS.iamIntegration),
        eksIntegration: documentFor(KARPENTER_CONTROLLER_POLICY_SIDS.eksIntegration),
        resourceDiscovery: documentFor(KARPENTER_CONTROLLER_POLICY_SIDS.resourceDiscovery),
        zonalShift: documentFor(KARPENTER_CONTROLLER_POLICY_SIDS.zonalShift),
    };
};

/**
 * Alias retained for backward compatibility. The controller IAM permissions are shared between the
 * v1beta1 and stable-v1 CRD generations. Prefer {@link KarpenterControllerPolicyV1Groups} for the
 * stable-v1 addon so the permissions are attached as multiple size-bounded managed policies.
 */
export const KarpenterControllerPolicyV1 = KarpenterControllerPolicyBeta;
