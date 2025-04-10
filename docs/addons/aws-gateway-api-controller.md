# AWS Gateway API Controller Add-on

This add-on installs the [AWS Gateway API Controller](https://www.gateway-api-controller.eks.aws.dev/latest) in your cluster to enable Amazon VPC Lattice service networking capabilities.

The AWS Gateway API Controller watches for Gateway API resources (Gateway, HTTPRoute, etc) and provisions corresponding Amazon VPC Lattice resources to enable service networking across multiple clusters and VPCs.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const addOns = 
    new blueprints.addons.AwsGatewayApiControllerAddOn();

const blueprint = blueprints.EksBlueprint.builder()
    .addOns(addOn)
    .build();
```

## Configuration Options

| Environment Variable               | Type   | Default                         | Description |
|-------------------------------------|--------|---------------------------------|-------------|
| `clusterName`                      | string | Inferred from IMDS metadata    | A unique name to identify a cluster. Used in AWS resource tags. Required except for EKS cluster. Needs to be specified if IMDS is not available. |
| `clusterVpcId`                     | string | Inferred from IMDS metadata    | Specifies the VPC of the cluster when running outside Kubernetes. Needs to be specified if IMDS is not available. |
| `awsAccountId`                     | string | Inferred from IMDS metadata    | Specifies the AWS account when running outside Kubernetes. Needs to be specified if IMDS is not available. |
| `region`                           | string | Inferred from IMDS metadata    | Specifies the AWS Region of VPC Lattice Service endpoint when running outside Kubernetes. Needs to be specified if IMDS is not available. |
| `logLevel`                         | string | `"info"`                        | When set to `"debug"`, emits debug level logs. |
| `defaultServiceNetwork`            | string | `""`                            | When set as a non-empty value, creates a service network with that name and associates it with the cluster VPC. |
| `enableServiceNetworkOverride`     | string | `""`                            | When set to `"true"`, the controller runs in "single service network" mode, overriding all gateways to point to the default service network. Useful for small setups and conformance tests. |
| `webhookEnabled`                   | string | `""`                            | When set to `"true"`, starts the webhook listener responsible for pod readiness gate injection. Disabled by default for deploy.yaml but enabled by default for Helm install. |
| `disableTaggingServiceApi`         | string | `""`                            | When set to `"true"`, the controller will not use the AWS Resource Groups Tagging API. Necessary for private clusters. When enabled, the controller uses VPC Lattice APIs for tag lookups, which are less performant. The Helm chart sets this to `"false"` by default. |
| `routeMaxConcurrentReconciles`     | int    | `1`                             | Maximum number of concurrently running reconcile loops per route type (HTTP, GRPC, TLS). |


## IAM Permissions

The add-on creates an IAM role with the following permissions:

```json
{
    "Version": "2012-10-17", 
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "vpc-lattice:*",
                "ec2:DescribeVpcs",
                "ec2:DescribeSubnets",
                "ec2:DescribeTags",
                "ec2:DescribeSecurityGroups",
                "logs:CreateLogDelivery",
                "logs:GetLogDelivery", 
                "logs:DescribeLogGroups",
                "logs:PutResourcePolicy",
                "logs:DescribeResourcePolicies",
                "logs:UpdateLogDelivery",
                "logs:DeleteLogDelivery",
                "logs:ListLogDeliveries",
                "tag:GetResources",
                "firehose:TagDeliveryStream",
                "s3:GetBucketPolicy",
                "s3:PutBucketPolicy"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": "iam:CreateServiceLinkedRole",
            "Resource": "arn:aws:iam::*:role/aws-service-role/vpc-lattice.amazonaws.com/AWSServiceRoleForVpcLattice",
            "Condition": {
                "StringLike": {
                    "iam:AWSServiceName": "vpc-lattice.amazonaws.com"
                }
            }
        },
        {
            "Effect": "Allow", 
            "Action": "iam:CreateServiceLinkedRole",
            "Resource": "arn:aws:iam::*:role/aws-service-role/delivery.logs.amazonaws.com/AWSServiceRoleForLogDelivery",
            "Condition": {
                "StringLike": {
                    "iam:AWSServiceName": "delivery.logs.amazonaws.com"
                }
            }
        }
    ]
}
```

## Functionality

The add-on:
- Installs the AWS Gateway API Controller using Helm
- Creates necessary IAM roles and service accounts
- Configures VPC Lattice service networking
- Enables Gateway API resources (Gateway, HTTPRoute)
- Manages VPC Lattice target groups and health checks
