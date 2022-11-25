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
    skipVersionValidation: true
}),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

> Pattern # 2 : This installs AWS Controller for Kubernetes for RDS ACK controller. After Installing this RDS ACK Controller, the instructions in [Provision ACK Resource](https://preview--eksworkshop-v2-next.netlify.app/docs/gitops/controlplanes/ack/configureResources) can be used to provision Amazon RDS database using the RDS ACK controller as an example

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AckAddOn({
  skipVersionValidation: true,
  name: "rds-chart",
  chart: "rds-chart",
  version: "v0.1.1",
  release: "rds-chart",
  repository: "oci://public.ecr.aws/aws-controllers-k8s/rds-chart",
  managedPolicyName: "AmazonRDSFullAccess",
  createNamespace: false
}),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

> Pattern # 3 : This installs AWS Controller for Kubernetes for EC2 ACK controller. After Installing this RDS ACK Controller, the instructions in [Provision ACK Resource](https://preview--eksworkshop-v2-next.netlify.app/docs/gitops/controlplanes/ack/configureResources) can be used to provision EC2 namespaces `SecurityGroup` resources required for creating Amazon RDS database as an example.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AckAddOn({
  skipVersionValidation: true,
  name: "ec2-chart",
  chart: "ec2-chart",
  version: "v0.1.0",
  release: "ec2-chart",
  repository: "oci://public.ecr.aws/aws-controllers-k8s/ec2-chart",
  managedPolicyName: "AmazonEC2FullAccess",
  createNamespace: false
}),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `name`: Name of the ACK Chart
- `chart`: Chart Name of the ACK Chart
- `version`: Version of the ACK Chart
- `release`: Release Name of the ACK Chart
- `repository`: Repository URI of the specific ACK Chart
- `managedPolicyName`: Policy Name required to be added to the IAM role for that ACK
- `createNamespace`: (boolean) This should be false if you are using for the second time
- `values`: Arbitrary values to pass to the chart. Refer to the cert-manager [Helm Chart documentation](https://artifacthub.io/packages/helm/cert-manager/cert-manager) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options)

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
- [ACK Workshop](https://preview--eksworkshop-v2-next.netlify.app/docs/gitops/controlplanes/ack/)
- [ECR Gallery for ACK](https://gallery.ecr.aws/aws-controllers-k8s/)
- [ACK GitHub](https://github.com/aws-controllers-k8s/community)