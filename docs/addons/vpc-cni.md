# VPC CNI Amazon EKS Add-on

The `VPC CNI Amazon EKS Add-on` adds support for `Amazon VPC Container Network Interface (CNI)` plugin.

Amazon EKS supports native VPC networking with the Amazon VPC Container Network Interface (CNI) plugin for Kubernetes. Using this plugin allows Kubernetes pods to have the same IP address inside the pod as they do on the VPC network. For more information, see [Pod networking (CNI)](https://docs.aws.amazon.com/eks/latest/userguide/pod-networking.html).

Installing VPC CNI as [Amazon EKS add-on](https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html) will reduce the amount of work that is needed to do in order to install, configure, and update add-ons. It includes the latest security patches, bug fixes and is validated by AWS to work with Amazon EKS. This ensures that Amazon EKS clusters are secure and stable.

Amazon EKS automatically installs VPC CNI as self-managed add-on for every cluster. So if it is already running on your cluster, you can still install it as Amazon EKS add-on to start benefiting from the capabilities of Amazon EKS add-ons.

Amazon EKS VPC CNI Addon now supports advanced configurations which means we can now pass configuration values as environment variables for setting up advanced configurations in Amazon VPC CNI. Please refer [Amazon EKS add-ons: Advanced configuration](https://aws.amazon.com/blogs/containers/amazon-eks-add-ons-advanced-configuration/) for more informatoion.

## Prerequisite
- Amazon EKS add-ons are only available with Amazon EKS clusters running Kubernetes version 1.18 and later.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.VpcCniAddOn({
'v1.12.1-eksbuild.2',
//Enabling prefix delegation to Primary ENIs.
enablePrefixDelegation: true, 
//Enables Custom Networking with Secondary CIDRs.
awsVpcK8sCniCustomNetworkCfg: true
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
//This required to create Secondary CIDR while creating your VPC.
  .resourceProvider(blueprints.GlobalResources.Vpc,new VpcProvider(undefined,"10.64.0.0/24",))
  .build(app, 'my-stack-name');
```
## Configuration Options

   - `version`: Pass in the vpc-cni plugin version compatible with kubernetes-cluster version as shown below
```bash
# Assuming cluster version is 1.19, below command shows versions of the vpc-cni add-on available for the specified cluster's version.
aws eks describe-addon-versions \
    --addon-name vpc-cni \
    --kubernetes-version 1.23 \
    --query "addons[].addonVersions[].[addonVersion, compatibilities[].defaultVersion]" \
    --output text
# Output
v1.12.1-eksbuild.2
False
v1.12.1-eksbuild.1
False
v1.12.0-eksbuild.2
False
v1.12.0-eksbuild.1
False
v1.11.4-eksbuild.3
False
v1.11.4-eksbuild.2
False
v1.11.4-eksbuild.1
False
v1.11.3-eksbuild.3
False
v1.11.3-eksbuild.2
False
v1.11.3-eksbuild.1
False
v1.11.2-eksbuild.3
False
...
...
v1.7.5-eksbuild.1
False
v1.6.3-eksbuild.2
False
```  
# Validation
To validate that vpc-cni add-on is running, ensure that the pod is in Running state.

```
$ kubectl get pods  -n kube-system|grep aws-node
NAME              READY    STATUS    RESTARTS   AGE
aws-node-xzk5n     1/1     Running   0          34d
```

```bash
# Assuming cluster-name is my-cluster, below command shows the version of vpc-cni add-on installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name vpc-cni \
    --query "addon.addonVersion" \
    --output text
# Output
v1.12.1-eksbuild.2
```

## Functionality

Applies VPC CNI add-on to Amazon EKS cluster. 

## Custom Networking

Enabling custom networking does not modify existing nodes. Custom networking is a disruptive action. If you had any nodes in your cluster with running Pods before you switched to the custom CNI networking feature, you should cordon and drain the nodes to gracefully shutdown the Pods and then terminate the nodes. Only new nodes matching the ENIConfig label or annotations use custom networking, and hence the Pods scheduled on these new nodes can be assigned an IP from secondary CIDR.

Please check our [Amazon EKS Best Practices Guide for Networking](https://aws.github.io/aws-eks-best-practices/networking/index/) for more information on custom networking.

## References

- Reference [amazon-vpc-cni-k8s](https://github.com/aws/amazon-vpc-cni-k8s) to learn more about different VPC CNI Configuration Values
- Reference [VpcCniAddon](https://aws-quickstart.github.io/cdk-eks-blueprints/api/classes/addons.VpcCniAddOn.html) to learn more about this addon
- Reference [Amazon EKS Best Practices Guide for Networking](https://aws.github.io/aws-eks-best-practices/networking/index/) to learn about Amazon EKS networking best practices