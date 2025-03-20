// https://www.gateway-api-controller.eks.aws.dev/latest/guides/deploy/#setup
// https://raw.githubusercontent.com/aws/aws-application-networking-k8s/main/files/controller-installation/recommended-inline-policy.json

import * as iam from 'aws-cdk-lib/aws-iam';

export function getVpcLatticeControllerPolicy(): iam.PolicyStatement[] {
    const vpcLatticePolicy = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
            'vpc-lattice:*',
            'ec2:DescribeVpcs',
            'ec2:DescribeSubnets',
            'ec2:DescribeTags',
            'ec2:DescribeSecurityGroups',
            'logs:CreateLogDelivery',
            'logs:GetLogDelivery',
            'logs:DescribeLogGroups',
            'logs:PutResourcePolicy',
            'logs:DescribeResourcePolicies',
            'logs:UpdateLogDelivery',
            'logs:DeleteLogDelivery',
            'logs:ListLogDeliveries',
            'tag:GetResources',
            'firehose:TagDeliveryStream',
            's3:GetBucketPolicy',
            's3:PutBucketPolicy'
        ],
        resources: ['*']
    });

    const vpcLatticeServiceLinkedRole = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:CreateServiceLinkedRole'],
        resources: ['arn:aws:iam::*:role/aws-service-role/vpc-lattice.amazonaws.com/AWSServiceRoleForVpcLattice'],
        conditions: {
            StringLike: {
                'iam:AWSServiceName': 'vpc-lattice.amazonaws.com'
            }
        }
    });

    const logsServiceLinkedRole = new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:CreateServiceLinkedRole'],
        resources: ['arn:aws:iam::*:role/aws-service-role/delivery.logs.amazonaws.com/AWSServiceRoleForLogDelivery'],
        conditions: {
            StringLike: {
                'iam:AWSServiceName': 'delivery.logs.amazonaws.com'
            }
        }
    });

    return [
        vpcLatticePolicy,
        vpcLatticeServiceLinkedRole,
        logsServiceLinkedRole
    ];
}