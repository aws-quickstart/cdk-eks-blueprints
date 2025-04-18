# AWS Gateway API Controller Add-on

This add-on installs the [AWS Gateway API Controller](https://www.gateway-api-controller.eks.aws.dev/latest) in your cluster to enable Amazon VPC Lattice service networking capabilities.

The AWS Gateway API Controller watches for Gateway API resources (Gateway, HTTPRoute, etc) and provisions corresponding Amazon VPC Lattice resources to enable service networking across multiple clusters and VPCs.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const addOns = [
    new blueprints.addons.GatewayApiCrdsAddOn(),
    new blueprints.addons.AwsGatewayApiControllerAddOn(),
];

const blueprint = blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .build();
```

## Configuration Options

| Environment Variable               | Type   | Default     | Description |
|-----------------------------------|--------|-------------|-------------|
| `logLevel`                         | string | `"info"`    | When set as "debug", the AWS Gateway API Controller will emit debug level logs. |
| `defaultServiceNetwork`           | string | `""`        | When set as a non-empty value, creates a service network with that name. The created service network will be also associated with cluster VPC. |
| `enableServiceNetworkOverride`    | string | `"false"`   | When set as "true", the controller will run in "single service network" mode that will override all gateways to point to default service network, instead of searching for service network with the same name. Can be used for small setups and conformance tests.|
| `webhookEnabled`                  | string | `"false"`   | When set as "true", the controller will start the webhook listener responsible for pod readiness gate injection (see pod-readiness-gates.md). This is disabled by default for deploy.yaml because the controller will not start successfully without the TLS certificate for the webhook in place. While this can be fixed by running scripts/gen-webhook-cert.sh, it requires manual action. The webhook is enabled by default for the Helm install as the Helm install will also generate the necessary certificate. |
| `disableTaggingServiceApi`        | string | `"false"`   | When set as "true", the controller will not use the AWS Resource Groups Tagging API. The Resource Groups Tagging API is only available on the public internet and customers using private clusters will need to enable this feature. When enabled, the controller will use VPC Lattice APIs to lookup tags which are not as performant and requires more API calls. The Helm chart sets this value to "false" by default. |
| `routeMaxConcurrentReconciles`    | int    | `1`         | Maximum number of concurrently running reconcile loops per route type (HTTP, GRPC, TLS). |


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
    - Note: Depends on GatewayApiCrdsAddOn
- Creates necessary IAM roles and service accounts
- Configures VPC Lattice service networking
- Enables Gateway API resources (Gateway, HTTPRoute)
- Manages VPC Lattice target groups and health checks
