# EFS CSI Driver Amazon EKS Add-on

The `EFS CSI Driver Amazon EKS Add-on` provides a CSI interface that allows Kubernetes clusters running on AWS to manage the lifecycle of Amazon EFS volumes for persistent storage.
EFS CSI driver supports both dynamic and static provisioning of storage

A couple of things to note:

- Driver is not compatible with Windows-based container images
- The number of replicas to be deployed must be less or equal to the number of nodes in the cluster

For more information on the driver, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html).

## Prerequisites

- The EFS file system itself must be created in AWS separately as the driver uses the EFS for storage, but it does not create it.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.EfsCsiDriverAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `version`: Version of the EFS CSI Driver add-on to be installed. Version 2.2.3 will be installed by default if a value is not provided
- `replicaCount`: Number of replicas to be deployed. If not provided, two replicas will be deployed. Note that the number of replicas
  should be less than or equal to the number of nodes in the cluster otherwise some pods will be left of pending state


## Validation

To validate that EFS CSI Driver add-on is installed properly, ensure that the ebs pods are running in the cluster

```bash
kubectl get pods -n kube-system | grep efs

# Output
efs-csi-controller-7c9bd5d86d-v7jtk            3/3     Running   0          155m
efs-csi-node-2c29j                             3/3     Running   0          155m


```

Additionally, the [driver documentation](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html) shows how to create an EFS file system to test the driver 

## Functionality

Applies the EFS CSI Driver add-on to an Amazon EKS cluster. 