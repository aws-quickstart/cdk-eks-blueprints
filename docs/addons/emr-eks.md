# EMR on EKS Add-on

The `Amazon EMR on EKS Add-on` enables EMR on EKS service to use an EKS cluster. It creates the EMR on EKS IAM Service Linked Role and adds it to `awsAuth` configmap. This Add-on **MUST** be used with [EMR on EKS Team](../teams/emr-eks-team.md).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.EmrEksAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```
## Verify

Once the AddOn is deployed you can execute the following command:

```
kubectl describe -n kube-system configmap/aws-auth
```
The output of the command would show a list of IAM role and mapping to Kuberenets users, one fo the mapping would be for EMR on EKS role and would be similar to below.

```
  mapRoles: |
    - rolearn: arn:aws:iam::<your-account-id>:role/AWSServiceRoleForAmazonEMRContainers
      username: emr-containers
```