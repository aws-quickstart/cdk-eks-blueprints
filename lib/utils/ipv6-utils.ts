
/*
** This policy is required for all the roles which are manging/creating the nodes in the cluster.
** So, we need it for both cluster node role and karpenter node role.
** Refer to: https://docs.aws.amazon.com/eks/latest/userguide/cni-iam-role.html#cni-iam-role-create-role
 */
import {PolicyDocument} from "aws-cdk-lib/aws-iam";

export function getEKSNodeIpv6PolicyDocument(): PolicyDocument {
    return PolicyDocument.fromJson({
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": [
                    "ec2:AssignIpv6Addresses",
                    "ec2:DescribeInstances",
                    "ec2:DescribeTags",
                    "ec2:DescribeNetworkInterfaces",
                    "ec2:DescribeInstanceTypes"
                ],
                "Resource": "*"
            },
            {
                "Effect": "Allow",
                "Action": [
                    "ec2:CreateTags"
                ],
                "Resource": [
                    "arn:aws:ec2:*:*:network-interface/*"
                ]
            }
        ]
    });
}