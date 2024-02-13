# Amazon EKS Pod Identity Agent Add-on

Amazon EKS Pod Identity associations provide the ability to manage credentials for your applications, similar to the way that Amazon EC2 instance profiles provide credentials to Amazon EC2 instances.

Amazon EKS Pod Identity provides credentials to your workloads with an additional EKS Auth API and an agent pod that runs on each node

For more information on the driver, please review the [user guide](https://docs.aws.amazon.com/en_ca/eks/latest/userguide/pod-id-agent-setup.html).

## Prerequisites
- Amazon EKS Pod Identity Driver add-on is only available on Amazon EKS clusters running Kubernetes version 1.24 and later.
- EKS Pod Identities are available on Linux Amazon EC2 instances

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.EksPodIdentityAgentAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `version`: Version of the Amazon EKS Pod Identity Agent add-on to be installed. The version must be compatible with kubernetes cluster version.

```bash
# Command to show versions of the EKS Pod Identity Agent add-on available for cluster version is 1.24
 aws eks describe-addon-versions \
--addon-name eks-pod-identity-agent \
--kubernetes-version 1.24 \
--query "addons[].addonVersions[].[addonVersion, compatibilities[].defaultVersion]" --output text

# Output
v1.0.0-eksbuild.1

```

## Validation

To validate that EKS Pod Identity Agent add-on is installed properly, ensure that the pods are running in the cluster

```bash
kubectl get pods -n kube-system | grep 'eks-pod-identity-agent'

# Output
eks-pod-identity-agent-gmqp7                                          1/1     Running   1 (24h ago)   24h
eks-pod-identity-agent-prnsh                                          1/1     Running   1 (24h ago)   24h

```

Additionally, the `aws cli` can be used to determine which version of the add-on is installed in the cluster
```bash
# Assuming cluster-name is my-cluster, below command shows the version of coredns installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name eks-pod-identity-agent \
    --query "addon.addonVersion" \
    --output text

# Output
v1.0.0-eksbuild.1
```

## Functionality

Applies the EKS Pod Identity Agent add-on to an Amazon EKS cluster.