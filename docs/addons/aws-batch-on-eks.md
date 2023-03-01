# AWS Batch on EKS

AWS Batch is a managed service that orchestrates batch workloads in your Kubernetes clusters that are managed by Amazon Elastic Kubernetes Service (Amazon EKS). Since AWS Batch is a managed service, there are no Kubernetes components (for example, Operators or Custom Resources) to install or manage in your cluster. AWS Batch only needs your cluster to be configured with Role-Based Access Controls (RBAC) that allow AWS Batch to communicate with the Kubernetes API server. AWS Batch calls Kubernetes APIs to create, monitor, and delete Kubernetes pods and nodes.

For more information, consult our [official documentations](https://docs.aws.amazon.com/batch/latest/userguide/eks.html).

This Add-on **MUST** be used with [AWS Batch on EKS Team](../teams/aws-batch-on-eks-team.md).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AwsBatchAddOn();

const blueprint = blueprints.EksBlueprint.builder()
    .addOns(addOn)
    .build(app, 'my-stack-name');
```

Once the AddOn is deployed you can execute the following command:

```
kubectl describe -n kube-system configmap/aws-auth
```
The output of the command would show a list of IAM role and mapping to Kubernetes users, one fo the mapping would be for AWS Batch on EKS role and would be similar to the following:

```
  mapRoles: |
    - rolearn: arn:aws:iam::<your-account-id>:role/AWSServiceRoleForBatch
      username: aws-batch
```