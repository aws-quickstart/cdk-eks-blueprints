# AWS Controller for Kubernetes Add-on

This add-on installs [aws-controller-8s](https://github.com/aws-controllers-k8s/community).

AWS Controllers for Kubernetes (ACK) lets you define and use AWS service resources directly from Kubernetes. With ACK, you can take advantage of AWS managed services for your Kubernetes applications without needing to define resources outside of the cluster or run services that provide supporting capabilities like databases or message queues within the cluster.

ACK is an open source project built with ❤️ by AWS. The project is composed of many source code repositories containing a common runtime, a code generator, common testing tools and Kubernetes custom controllers for individual AWS service APIs.

## Usage

> Pattern # 1 : This installs AWS Controller for Kubernetes for IAM ACK Controller. This uses all default parameters for installation of the IAM Controller.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AckAddOn({
  serviceName: AckServiceName.IAM,
}),

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

> Pattern # 2 : This installs AWS Controller for Kubernetes for EC2 ACK controller using service name internally referencing service mapping values for helm options. After Installing this EC2 ACK Controller, the instructions in [Provision ACK Resource](https://www.eksworkshop.com/docs/automation/controlplanes/ack/provision-resources) can be used to provision EC2 namespaces `SecurityGroup` resources required for creating Amazon RDS database as an example.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AckAddOn({
  id: "ec2-ack", // Having this field is important if you are using multiple iterations of this Addon.
  createNamespace: false, //This is essential if you are using multiple iterations of this Addon to run in same namespace.
  serviceName: AckServiceName.EC2 // This value can be references from supported service section below,
}),

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

> Pattern # 3 : This installs AWS Controller for Kubernetes for S3 ACK controller with user specified values. After Installing this S3 ACK Controller, the instructions in [Provision ACK Resource](https://www.eksworkshop.com/docs/automation/controlplanes/ack/provision-resources) can be used to provision Amazon S3 resources using the S3 ACK controller as an example.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as iam from "aws-cdk-lib/aws-iam";
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AckAddOn({
  id: "s3-ack",
  serviceName: AckServiceName.S3,
  name: "s3-chart",
  chart: "s3-chart",
  version: "v0.1.1",
  release: "s3-chart",
  repository: "oci://public.ecr.aws/aws-controllers-k8s/s3-chart",
  managedPolicyName: "AmazonS3FullAccess",
  inlinePolicyStatements: [
    iam.PolicyStatement.fromJson({
      "Sid": "S3AllPermission",
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "s3-object-lambda:*"
      ],
      "Resource": "*"
    }),
    iam.PolicyStatement.fromJson({
      "Sid": "S3ReplicationPassRole",
      "Condition": {
        "StringEquals": {
          "iam:PassedToService": "s3.amazonaws.com"
        }
      },
      "Action": "iam:PassRole",
      "Resource": "*",
      "Effect": "Allow"
    })
  ],
  createNamespace: false,
  saName: "s3-chart"
})

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `id`: Unique identifier of the Addon especially if you are using ACK Addon multiple times
- `serviceName`: Name of the service and this is mandatory
- `name`: Name of the ACK Chart
- `chart`: Chart Name of the ACK Chart
- `version`: Version of the ACK Chart
- `release`: Release Name of the ACK Chart
- `repository`: Repository URI of the specific ACK Chart
- `managedPolicyName`: Policy Name required to be added to the IAM role for that ACK
- `inlinePolicyStatements`: Inline Policy Statements required to be added to the IAM role for that ACK
- `createNamespace`: (boolean) This should be false if you are using for the second time
- `saName` : Name to create the service account.
- `values`: Arbitrary values to pass to the chart
- [Standard helm configuration options](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

## Validation

To validate that ack-controller-k8s is installed properly in the cluster, check if the namespace is created and pods are running in the `ack-system` namespace.

Verify if the namespace is created correctly
```bash
  kubectl get all -n ack-system
```
There should be list the following resources in the namespace
```bash
NAME                             READY   STATUS    RESTARTS   AGE
pod/iam-chart-64c8fd7f6-wpb5k    1/1     Running   0          34m
pod/rds-chart-5f6f5b8fc7-hp55l   1/1     Running   0          5m26s

NAME                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/iam-chart   1/1     1            1           35m
deployment.apps/rds-chart   1/1     1            1           5m36s

NAME                                   DESIRED   CURRENT   READY   AGE
replicaset.apps/iam-chart-64c8fd7f6    1         1         1       35m
replicaset.apps/rds-chart-5f6f5b8fc7   1         1         1       5m36s
```

## aws-controller-8s references

Please refer to following aws-controller-8s references for more information :
- [ACK Workshop](https://www.eksworkshop.com/docs/automation/controlplanes/ack/)
- [ECR Gallery for ACK](https://gallery.ecr.aws/aws-controllers-k8s/) 
- [ACK GitHub](https://github.com/aws-controllers-k8s/community)

## Supported AWS Services by ACK Addon

*You can use this ACK Addon today to provision resources for below mentioned 22 AWS services:*

1. ACM
2. ACMPCA
3. APIGATEWAYV2
4. APPLICATIONAUTOSCALING
5. CLOUDTRAIL
6. CLOUDWATCH
7. CLOUDWATCHLOGS
8. DYNAMODB
9. EC2
10. ECR
11. EMRCONTAINERS
12. EKS
13. ELASTICACHE
14. ELASTICSEARCHSERVICE
15. EVENTBRIDGE
16. IAM
17. KAFKA
18. KINESIS
19. KMS
20. LAMBDA
21. MEMORYDB
22. MQ
23. OPENSEARCHSERVICE
24. PIPES
25. PROMETHEUSSERVICE
26. RDS
27. ROUTE53
28. ROUTE53RESOLVER
29. S3
30. SAGEMAKER
31. SECRETSMANAGER
32. SFN
33. SNS
34. SQS

*We highly recommend you to contribute to this ACK Addon whenever there is a newer service or new version of supported service by this Addon is published to [ECR Gallery for ACK](https://gallery.ecr.aws/aws-controllers-k8s/).*
