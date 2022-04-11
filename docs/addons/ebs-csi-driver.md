# EBS CSI Driver Amazon EKS Add-on

The `EBS CSI Driver Amazon EKS Add-on` allows Amazon Elastic Kubernetes Service (Amazon EKS) clusters to manage the lifecycle of Amazon EBS volumes for persistent volumes.

This driver is not automatically installed when you first create a cluster, it must be added to the cluster in order to manage EBS volumes.

For more information on the driver, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html).

## Prerequisites
- Amazon EKS EBS CSI Driver add-on is only available on Amazon EKS clusters running Kubernetes version 1.20 and later.
- Note that the version of the driver that can be used on an EKS cluster depends on the version of Kubernetes running in the cluster. See the configuration options section below for more details

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.EbsCsiDriverAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `version`: Version of the EBS CSI Driver add-on to be installed. The version must be compatible with kubernetes cluster version. 

```bash
# Command to show versions of the EBS CSI Driver add-on available for cluster version is 1.20
 aws eks describe-addon-versions \
--addon-name aws-ebs-csi-driver \
--kubernetes-version 1.20 \
--query "addons[].addonVersions[].[addonVersion, compatibilities[].defaultVersion]" --output text

# Output
v1.4.0-eksbuild.preview

```

## Validation

To validate that EBS CSI Driver add-on is installed properly, ensure that the ebs pods are running in the cluster

```bash
kubectl get pods -n kube-system | grep ebs

# Output
ebs-csi-controller-95848f4d9-hlrzs   4/4     Running   0          5m8s
ebs-csi-controller-95848f4d9-m4f54   4/4     Running   0          4m38s
ebs-csi-node-c9xdf                   3/3     Running   0          5m8s


```

Additionally, the `aws cli` can be used to determine which version of the add-on is installed in the cluster
```bash
# Assuming cluster-name is my-cluster, below command shows the version of coredns installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name aws-ebs-csi-driver \
    --query "addon.addonVersion" \
    --output text
    
# Output
v1.4.0-eksbuild.preview
```  

## Functionality

Applies the EBS CSI Driver add-on to an Amazon EKS cluster. 