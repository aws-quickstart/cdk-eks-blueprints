# VPC CNI Amazon EKS Add-on

The `VPC CNI Amazon EKS Add-on` adds support for `Amazon VPC Container Network Interface (CNI)` plugin.

Amazon EKS supports native VPC networking with the Amazon VPC Container Network Interface (CNI) plugin for Kubernetes. Using this plugin allows Kubernetes pods to have the same IP address inside the pod as they do on the VPC network. For more information, see [Pod networking (CNI)](https://docs.aws.amazon.com/eks/latest/userguide/pod-networking.html).

Installing VPC CNI as [Amazon EKS add-on](https://docs.aws.amazon.com/eks/latest/userguide/eks-add-ons.html) will reduce the amount of work that is needed to do in order to install, configure, and update add-ons. It includes the latest security patches, bug fixes and is validated by AWS to work with Amazon EKS. This ensures that Amazon EKS clusters are secure and stable.

Amazon EKS automatically installs VPC CNI as self-managed add-on for every cluster. So if it is already running on your cluster, you can still install it as Amazon EKS add-on to start benefiting from the capabilities of Amazon EKS add-ons.

Amazon EKS VPC CNI Addon now supports advanced configurations which means we can now pass configuration values as a JSON blob for setting up advanced configurations in Amazon VPC CNI. Please refer [Amazon EKS add-ons: Advanced configuration](https://aws.amazon.com/blogs/containers/amazon-eks-add-ons-advanced-configuration/) for more informatoion.

## Prerequisite
- Amazon EKS add-ons are only available with Amazon EKS clusters running Kubernetes version 1.18 and later.

## Usage

This add-on can used with two different patterns :

Pattern # 1 : Simple and Easy. With all default values. This pattern wont create custom networking or setup any environment variables as part of configuration Values.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.VpcCniAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Pattern # 2 : Custom networking with new Secondary CIDR ranges. This pattern will first create Secondary CIDRs and Secondary Subnets with specified range of CIDRs as shown below in `resourceProvider` command. Then the VPC CNI addon will setup custom networking based on the parameters `awsVpcK8sCniCustomNetworkCfg`, `eniConfigLabelDef: "topology.kubernetes.io/zone"` for your Amazon EKS cluster workloads with created secondary subnet ranges to solve IP exhaustion.

Note: 
- When you are passing secondary CIDRs to the VPC resource provider, then we create secondary subnets for the customer and register them under names secondary-cidr-subnet-${order} with the resource providers.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.VpcCniAddOn({
  customNetworkingConfig: {
      subnets: [
          blueprints.getNamedResource("secondary-cidr-subnet-0"),
          blueprints.getNamedResource("secondary-cidr-subnet-1"),
          blueprints.getNamedResource("secondary-cidr-subnet-2"),
      ]   
  },
  awsVpcK8sCniCustomNetworkCfg: true,
  eniConfigLabelDef: 'topology.kubernetes.io/zone'
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .resourceProvider(blueprints.GlobalResources.Vpc, new VpcProvider(undefined,"10.64.0.0/24",["10.64.0.0/25","10.64.0.128/26","10.64.0.192/26"],))
  .build(app, 'my-stack-name');
```

Pattern # 3 : Custom networking with custom VPC and Secondary Subnets. This pattern will use the custom VPC ID and Secondary subnet IDs passed by the user to create the blueprints stack. Then the VPC CNI addon will setup custom networking based on the parameters `awsVpcK8sCniCustomNetworkCfg`, `eniConfigLabelDef: "topology.kubernetes.io/zone"` for your Amazon EKS cluster workloads with passed secondary subnet ranges to solve IP exhaustion. 

Note : 
- When you are passing secondary subnet ids to the VPC resource provider, then we register them under names secondary-cidr-subnet-${order} with the resource providers.
- When you are passing your own Secondary subnets using this pattern, Please make sure the tag `Key: kubernetes.io/role/internal-elb", Value: "1"` is added to your secondary subnets. Please register your secondary subnets in any arbitary name as shown below in `resourceProvider`.Please check out [Custom Networking Tutorial](https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html) to learn how custome networking is manually setup on your Amazon EKS cluster.

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.VpcCniAddOn({
  customNetworkingConfig: {
      subnets: [
          blueprints.getNamedResource("secondary-cidr-subnet-0"),
          blueprints.getNamedResource("secondary-cidr-subnet-1"),
          blueprints.getNamedResource("secondary-cidr-subnet-2"),
      ]   
  },
  awsVpcK8sCniCustomNetworkCfg: true,
  eniConfigLabelDef: 'topology.kubernetes.io/zone'
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .resourceProvider(blueprints.GlobalResources.Vpc, new VpcProvider(yourVpcId))
  .resourceProvider("secondary-cidr-subnet-0", new LookupSubnetProvider(subnet1Id)
  .resourceProvider("secondary-cidr-subnet-1", new LookupSubnetProvider(subnet2Id)
  .resourceProvider("secondary-cidr-subnet-2", new LookupSubnetProvider(subnet3Id)
  .build(app, 'my-stack-name');
``` 

## Configuration Options

   - `version`: Pass in the optional vpc-cni plugin version compatible with kubernetes-cluster version as shown below
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
$ kubectl -n kube-system get ds aws-node -oyaml|grep AWS_VPC_K8S_CNI_CUSTOM_NETWORK_CFG -A1

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

We are installing VPC CNI addon of CDK EKS blueprints ahead of your data plane node creation so we dont have a need to cordon and drain the nodes to gracefully shutdown the Pods and then terminate the nodes. VPC CNI addon will be first installed on Amazon EKS Control Plane, then data plan nodes will be deployed and then all the other day 2 operational addons you have opted in will be installed. This solves IP exhaustion via custom networking of VPC CNI addon out of the box without any manual intervention.

Please check our [Amazon EKS Best Practices Guide for Networking](https://aws.github.io/aws-eks-best-practices/networking/index/) for more information on custom networking.

## References

- Reference [amazon-vpc-cni-k8s](https://github.com/aws/amazon-vpc-cni-k8s) to learn more about different VPC CNI configuration Values
- Reference [VpcCniAddon](https://aws-quickstart.github.io/cdk-eks-blueprints/api/classes/addons.VpcCniAddOn.html) to learn more about this addon
- Reference [Amazon EKS Best Practices Guide for Networking](https://aws.github.io/aws-eks-best-practices/networking/index/) to learn about Amazon EKS networking best practices
- Reference [Custom Networking Tutorial](https://docs.aws.amazon.com/eks/latest/userguide/cni-custom-network.html) to learn how custome networking is manually setup on your Amazon EKS cluster.