# Kube-proxy Amazon EKS Add-on

The `Kube-proxy Amazon EKS Add-on` adds support for [kube-proxy](https://kubernetes.io/docs/concepts/overview/components/#kube-proxy).

Kube-proxy maintains network rules on each Amazon EC2 node. It enables network communication to your pods. Kube-proxy is not deployed to Fargate nodes. For more information, see [ kube-proxy ](https://kubernetes.io/docs/concepts/overview/components/#kube-proxy) in the Kubernetes documentation.

Installing Kube-proxy as [Amazon EKS add-on](https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html) will reduce the amount of work that is needed to do in order to install, configure, and update add-ons. It includes the latest security patches, bug fixes and is validated by AWS to work with Amazon EKS. This ensures that Amazon EKS clusters are secure and stable.

Amazon EKS automatically installs Kube-proxy as self-managed add-on for every cluster. So if it is already running on your cluster, you can still install it as Amazon EKS add-on to start benefiting from the capabilities of Amazon EKS add-ons.

## Prerequisite
- Amazon EKS add-ons are only available with Amazon EKS clusters running Kubernetes version 1.18 and later.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.KubeProxyAddOn('v1.19.6-eksbuild.2'); // optionally specify the image version to pull or empty constructor

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```
## Configuration Options

   - `version`: Pass in the kube-proxy plugin version compatible with kubernetes-cluster version as shown below
```bash
# Assuming cluster version is 1.20, below command shows versions of the Kube-proxy add-on available for the specified cluster's version.
aws eks describe-addon-versions \
    --addon-name kube-proxy \
    --kubernetes-version 1.19 \
    --query "addons[].addonVersions[].[addonVersion, compatibilities[].defaultVersion]" \
    --output text
# Output
v1.19.6-eksbuild.2
True
v1.18.8-eksbuild.1
False
```
# Validation
To validate that kube-proxy add-on is running, ensure that the pod is in Running state
```bash
$ kubectl get pods  -n kube-system|grep kube-proxy
NAME                READY    STATUS    RESTARTS     AGE
kube-proxy-6lrjm     1/1     Running       0        34d
```  
```bash
# Assuming cluster-name is my-cluster, below command shows the version of Kube-proxy installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name kube-proxy \
    --query "addon.addonVersion" \
    --output text
# Output
v1.19.6-eksbuild.2
```
## Functionality

Applies Kube-proxy add-on to Amazon EKS cluster.