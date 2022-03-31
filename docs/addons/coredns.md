# CoreDNS Amazon EKS Add-on

The `CoreDNS Amazon EKS Add-on` adds support for [CoreDNS](https://kubernetes.io/docs/tasks/administer-cluster/coredns/).

CoreDNS is a flexible, extensible DNS server that can serve as the Kubernetes cluster DNS. The CoreDNS Pods provide name resolution for all Pods in the cluster. For more information about CoreDNS, see [ Using CoreDNS for Service Discovery](https://kubernetes.io/docs/tasks/administer-cluster/coredns/) in the Kubernetes documentation.

Installing CoreDNS as [Amazon EKS add-on](https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html) will reduce the amount of work that is needed to do in order to install, configure, and update CoreDNS. It includes the latest security patches, bug fixes and is validated by AWS to work with Amazon EKS. This ensures that Amazon EKS clusters are secure and stable.

Amazon EKS automatically installs CoreDNS as self-managed add-on for every cluster. So if it is already running on your cluster, you can still install it as Amazon EKS add-on to start benefiting from the capabilities of Amazon EKS add-ons.

## Prerequisite
- Amazon EKS add-ons are only available with Amazon EKS clusters running Kubernetes version 1.18 and later.


## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CoreDnsAddOn("v1.8.0-eksbuild.1"); // optionally specify image version to pull or empty constructor

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```
## Configuration Options

   - `version`: Pass in the core-dns plugin version compatible with kubernetes-cluster version as shown below
```bash
# Assuming cluster version is 1.19, below command shows versions of the CoreDNS add-on available for the specified cluster's version.
aws eks describe-addon-versions \
--addon-name coredns \
--kubernetes-version 1.19 \
--query "addons[].addonVersions[].[addonVersion, compatibilities[].defaultVersion]" --output text
# Output
v1.8.3-eksbuild.1
False
v1.8.0-eksbuild.1
True
v1.7.0-eksbuild.1
False
```
# Validation
To validate that coredns add-on is running, ensure that both the coredns pods are in Running state.
```bash
$ kubectl get pods  -n kube-system|grep coredns
NAME                           READY    STATUS    RESTARTS     AGE
coredns-644944ff4-2hjkj         1/1     Running     0          34d
coredns-644944ff4-fz6p5         1/1     Running     0          34d
```
```bash
# Assuming cluster-name is my-cluster, below command shows the version of coredns installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name coredns \
    --query "addon.addonVersion" \
    --output text
# Output
v1.8.0-eksbuild.1
```  

## Functionality

Applies CoreDNS add-on to an Amazon EKS cluster. 