# Upbound Universal Crossplane (UXP) Amazon EKS Add-on

The `Upbound Universal Crossplane Amazon EKS Add-on` allows Amazon Elastic Kubernetes Service (Amazon EKS) clusters to manage the lifecycle of Crossplane distribution.

Upbound Universal Crossplane (UXP) is Upbound's official enterprise-grade Crossplane distribution. It's free, open source, and fully conformant with upstream Crossplane. UXP is hardened and tested by Upbound so customers can confidently deploy control plane architectures to production. Connect UXP to Upbound Cloud is enabled with a free Upbound account for simplified management.

For more information on the driver, please review the [aws marketplace](https://aws.amazon.com/marketplace/pp/prodview-uhc2iwi5xysoc?ref_=aws-mp-console-subscription-detail) and please make sure to subscribe this product in marketplace before using this addon.

## Prerequisites

- Subscription to Upbound Universal Crossplane (UXP) in AWS Marketplace.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.UpboundUniversalCrossplaneAddOn(),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `version`: Version of the Upbound Universal Crossplane add-on to be installed. 

```bash
# Command to show versions of the UXP add-on
aws eks describe-addon-versions 
    --addon-name upbound_universal-crossplane \
    --kubernetes-version 1.24 \
    --query "addons[].addonVersions[].[addonVersion, compatibilities[].defaultVersion]" \
    --output text

# Output
v1.9.1-eksbuild.0

```

## Validation

To validate that EBS CSI Driver add-on is installed properly, ensure that the ebs pods are running in the cluster

```bash
kubectl get all -n upbound-syste

# Output
NAME                                        READY   STATUS    RESTARTS      AGE
pod/crossplane-776449cbc7-t9jnn             1/1     Running   0             25m
pod/upbound-bootstrapper-844f84fcf4-xgpj9   1/1     Running   0             25m
pod/xgql-55d7475b48-dlfgc                   1/1     Running   2 (25m ago)   25m

NAME                    TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/upbound-agent   ClusterIP   172.20.131.84    <none>        6443/TCP   25m
service/xgql            ClusterIP   172.20.138.213   <none>        443/TCP    25m

NAME                                   READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/crossplane             1/1     1            1           25m
deployment.apps/upbound-bootstrapper   1/1     1            1           25m
deployment.apps/xgql                   1/1     1            1           25m

NAME                                              DESIRED   CURRENT   READY   AGE
replicaset.apps/crossplane-776449cbc7             1         1         1       25m
replicaset.apps/upbound-bootstrapper-844f84fcf4   1         1         1       25m
replicaset.apps/xgql-55d7475b48                   1         1         1       25m
```

Additionally, the `aws cli` can be used to determine which version of the UXP add-on is installed in the cluster

```bash
# Assuming cluster-name is my-cluster, below command shows the version of coredns installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name upbound_universal-crossplane \
    --query "addon.addonVersion" \
    --output text
    
# Output
v1.9.1-eksbuild.0
```  

## Functionality

Applies the Upbound Universal Crossplane add-on to an Amazon EKS cluster.
