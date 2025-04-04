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

// IAM Policy for Beta CRD Karpenter addons
export const KarpenterControllerPolicyBeta = (cluster: Cluster, partition: string, region: string) => {
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
                    "ec2:DescribeImages",
                    "ec2:DescribeInstances",
                    "ec2:DescribeInstanceTypeOfferings",
                    "ec2:DescribeInstanceTypes",
                    "ec2:DescribeLaunchTemplates",
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
                "Action": "iam:GetInstanceProfile"
            },
            {
                "Sid": "AllowAPIServerEndpointDiscovery",
                "Effect": "Allow",
                "Resource": `${cluster.clusterArn}`,
                "Action": "eks:DescribeCluster"
            }    
        ]
    };
};

export const KarpenterControllerPolicyV1 = KarpenterControllerPolicyBeta;