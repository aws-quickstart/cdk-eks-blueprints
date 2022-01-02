# Karpenter Add-on

External DNS add-on is based on the [ExternalDNS](https://github.com/kubernetes-sigs/external-dns) open source project and allows integration of exposed Kubernetes services and Ingresses with DNS providers, in particular [Amazon Route 53](https://aws.amazon.com/route53/).

The add-on provides functionality to configure IAM policies and Kubernetes service accounts for Route 53 integration support based on [AWS Tutorial for External DNS](https://github.com/kubernetes-sigs/external-dns/blob/master/docs/tutorials/aws.md).

## Prerequisite

Here are the prerequisites:
1. Karpenter discovers subnets tagged `kubernetes.io/cluster/$CLUSTER_NAME`. Private subnets where the EKS cluster is deployed shoule be tagged as such.
2. (If using Spot), EC2 Spot Service Linked Role should be created. See [here](https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html) for more details.

## Usage

```typescript
import * as ssp from '@aws-quickstart/ssp-amazon-eks';

const addOn = new ssp.addons.KarpenterAddOn();
const addOns: Array<ClusterAddOn> = [ addOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

To validate that Karpenter add-on is running ensure that the add-on deployments for the controller and the webhook are in `RUNNING` state:

```bash
# Assuming add-on is installed in the karpenter namespace.
$ kubectl get po -n karpenter
NAME                                    READY   STATUS    RESTARTS   AGE
karpenter-controller-79dc99d7cd-zkkf7   1/1     Running   0          62m
karpenter-webhook-7bf684c676-52chv      1/1     Running   0          62m
```

## Functionality

1. Creates Karpenter Node Role, Karpenter Instance Profile, and Karpenter Controller Policy.
2. Creates `karpenter` namespace.
3. Creates Kubernetes Service Account, and associate AWS IAM Role with Karpenter Controller Policy attached using [IRSA](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-enable-IAM.html).
4. Deploys Karpenter helm chart in the `karpenter` namespace.

## Using Karpenter

## Testing with a sample deployment
