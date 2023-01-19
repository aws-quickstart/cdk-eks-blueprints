# Karpenter Add-on

Karpenter add-on is based on the [Karpenter](https://github.com/aws/karpenter) open source node provisioning project. It provides a more efficient and cost-effective way to manage workloads by launching just the right compute resources to handle a cluster's application.

Karpenter works by:

* Watching for pods that the Kubernetes scheduler has marked as unschedulable,
* Evaluating scheduling constraints (resource requests, nodeselectors, affinities, tolerations, and topology spread constraints) requested by the pods,
* Provisioning nodes that meet the requirements of the pods,
* Scheduling the pods to run on the new nodes, and
* Removing the nodes when the nodes are no longer needed

## Prerequisites

1. This add-on depends on [VPC CNI](vpc-cni.md) Add-on for cni support.

***VPC CNI add-on must be present in add-on array*** and ***must be in add-on array before the Karpenter add-on*** for it to work, as shown in below example. Otherwise will run into error `Assertion failed: Missing a dependency for VpcCniAddOn`.

2. There is no support for utilizing both Cluster Autoscaler **and** Karpenter. Therefore, any addons list that has both will result in an error `Deploying <name of your stack> failed due to conflicting add-on: ClusterAutoscalerAddOn.`.

3. (If using Spot), EC2 Spot Service Linked Role should be created. See [here](https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html) for more details.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const karpenterAddonProps = {
  requirements: [
      { key: 'node.kubernetes.io/instance-type', op: 'In', vals: ['m5.2xlarge'] },
      { key: 'topology.kubernetes.io/zone', op: 'NotIn', vals: ['us-west-2c']},
      { key: 'kubernetes.io/arch', op: 'In', vals: ['amd64','arm64']},
      { key: 'karpenter.sh/capacity-type', op: 'In', vals: ['spot','on-demand']},
  ],
  subnetTags: {
    "Name": "blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1",
  },
  securityGroupTags: {
    "kubernetes.io/cluster/blueprint-construct-dev": "owned",
  },
  taints: [{
    key: "workload",
    value: "test",
    effect: "NoSchedule",
  }],
  amiFamily: "AL2",
  consolidation: { enabled: true },
  ttlSecondsUntilExpired: 2592000,
  weight: 20,
  interruptionHandling: true,
}
const vpcCniAddOn = new blueprints.addons.VpcCniAddOn();
const karpenterAddOn = new blueprints.addons.KarpenterAddOn(karpenterAddonProps);
const addOns: Array<blueprints.ClusterAddOn> = [ vpcCniAddOn, karpenterAddOn ];

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(...addOns)
  .build(app, 'my-stack-name');
```

The add-on automatically sets the following Helm Chart [values](https://github.com/aws/karpenter/tree/main/charts/karpenter#values), and it is **highly recommended** not to pass these values in (as it will result in errors):
- settings.aws.defaultInstanceProfile
- settings.aws.clusterEndpoint
- settings.aws.clusterName
- settings.aws.interruptionQueueName (if interruption handling is enabled)
- serviceAccount.create
- serviceAccount.name
- serviceAccount.annotations.eks.amazonaws.com/role-arn

To validate that Karpenter add-on is running ensure that the add-on deployments for the controller and the webhook are in `RUNNING` state:

```bash
# Assuming add-on is installed in the karpenter namespace.
$ kubectl get po -n karpenter
NAME                                          READY   STATUS    RESTARTS   AGE
blueprints-addon-karpenter-54fd978b89-hclmp   2/2     Running   0          99m
```

## Functionality

1. Creates Karpenter Node Role, Karpenter Instance Profile, and Karpenter Controller Policy (Please see Karpenter documentation [here](https://karpenter.sh/docs/getting-started/) for more details on what is required and why).
2. Creates `karpenter` namespace.
3. Creates Kubernetes Service Account, and associate AWS IAM Role with Karpenter Controller Policy attached using [IRSA](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-enable-IAM.html).
4. Deploys Karpenter helm chart in the `karpenter` namespace, configuring cluster name and cluster endpoint on the controller by default.
5. (Optionally) provisions a default Karpenter Provisioner CRD based on user-provided [spec.requirements](https://karpenter.sh/v0.12.1/provisioner/#specrequirements), [AMI type](https://karpenter.sh/v0.12.1/aws/provisioning/#amazon-machine-image-ami-family), taints and tags. If created, the provisioner will discover the EKS VPC subnets and security groups to launch the nodes with.

**NOTE:**
1. The default provisioner is created only if both the subnet tags and the security group tags are provided.
2. Provisioner spec requirement fields are not necessary, as karpenter will dynamically choose (i.e. leaving instance-type blank will let karpenter choose approrpriate sizing).
3. Consolidation, which is a flag that enables , is supported on versions 0.15.0 and later. It is also mutually exclusive with `ttlSecondsAfterempty`, so if you provide both properties, the addon will throw an error.
4. Weight, which is a property to prioritize provisioners based on weight, is supported on versions 0.16.0 and later. Addon will throw an error if weight is provided for earlier versions.
5. Interruption Handling, which is a native way to handle interruption due to involuntary interruption events, is supported on versions 0.19.0 and later. For interruption handling in the earlier versions, Karpenter supports using AWS Node Interruption Handler (which you will need to add as an add-on and ***must be in add-on array after the Karpenter add-on*** for it to work.

## Using Karpenter

To use Karpenter, you need to provision a Karpenter [provisioner CRD](https://karpenter.sh/docs/provisioner/). A single provisioner is capable of handling many different pod shapes.

This can be done in 2 ways:

1. Provide the properties as show in [Usage](#usage). If subnet tags and security group tags are not provided at deploy time, the add-on will be installed without a Provisioner.

2. Use `kubectl` to apply a sample provisioner manifest:
```bash
cat <<EOF | kubectl apply -f -
apiVersion: karpenter.sh/v1alpha5
kind: Provisioner
metadata:
  name: default
spec:
  requirements:
    - key: "node.kubernetes.io/instance-type"
      operator: In
      values: ["m5.2xlarge"]
    - key: "topology.kubernetes.io/zone"
      operator: In
      values: ["us-east-1c"]
    - key: "kubernetes.io/arch"
      operator: In
      values: ["arm64", "amd64"]
    - key: "karpenter.sh/capacity-type"
      operator: In
      values: ["spot", "on-demand"]
  provider:
    instanceProfile: <<Name of your Instance Profile>>
    subnetSelector:
      Name: blueprint-construct-dev/blueprint-construct-dev-vpc/PrivateSubnet1
    securityGroupSelector:
      "kubernetes.io/cluster/blueprint-construct-dev": "owned"
  ttlSecondsAfterEmpty: 30
EOF
```

If you choose to create a provisioner manually, you **MUST** provide the tags that match the subnet and the security group that you want to use.

## Testing with a sample deployment

Now that the provisioner is deployed, Karpenter is active and ready to provision nodes. Create some pods using a deployment:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inflate
spec:
  replicas: 0
  selector:
    matchLabels:
      app: inflate
  template:
    metadata:
      labels:
        app: inflate
    spec:
      terminationGracePeriodSeconds: 0
      containers:
        - name: inflate
          image: public.ecr.aws/eks-distro/kubernetes/pause:3.2
          resources:
            requests:
              cpu: 1
EOF
```

Now scale the deployment:

```bash
kubectl scale deployment inflate --replicas 10
```

The provisioner will then start deploying more nodes to deploy the scaled replicas. You can verify by either looking at the karpenter controller logs,

```bash
kubectl logs -f -n karpenter $(kubectl get pods -n karpenter -l karpenter=controller -o name)
```

or, by looking at the nodes being created:

```bash
kubectl get nodes
```

## Troubleshooting

The following are common troubleshooting issues observed when implementing Karpenter:

1. For Karpenter version older than `0.14.0` deployed on Fargate Profiles, `values.yaml` must be overridden, setting `dnsPolicy` to `Default`. Versions after `0.14.0` has `dnsPolicy` value set default to `Default`. This is to ensure CoreDNS is set correctly on Fargate nodes.

2. With the upgrade to the new OCI registry starting with `v0.17.0`, if you try to upgrade you may get a following error:

```
Received response status [FAILED] from custom resource. Message returned: Error: b'Error: path "/tmp/tmpkxgr57q5/blueprints-addon-karpenter" not found\n' 
```

Karpenter, starting from the OCI registry versions, will untar the files under `karpenter` release name only. So if you have previous version deployed under a different release name, you will run into the above error. Therefore, in order to upgrade, you will have to take the following steps:

  1. Remove the existing add-on.
  2. Re-deploy the Karpenter add-on with the release name `karpenter`.

## Upgrade Path

1. Using an older version of the Karptner add-on, you may notice the difference in the "provisionerSpecs" property:

```
provisionerSpecs: {
    'node.kubernetes.io/instance-type': ['m5.2xlarge'],
    'topology.kubernetes.io/zone': ['us-east-1c'],
    'kubernetes.io/arch': ['amd64','arm64'],
    'karpenter.sh/capacity-type': ['spot','on-demand'],
  },
```

This now changes to the "requirement" property:

```
requirements: [
      { key: 'node.kubernetes.io/instance-type', op: 'In', vals: ['m5.2xlarge'] },
      { key: 'topology.kubernetes.io/zone', op: 'NotIn', vals: ['us-west-2c']},
      { key: 'kubernetes.io/arch', op: 'In', vals: ['amd64','arm64']},
      { key: 'karpenter.sh/capacity-type', op: 'In', vals: ['spot','on-demand']},
  ],
```

The property is changed to align with the naming convention of the provisioner, and to allow multiple operators (In vs NotIn). The values correspond similarly between the two, with type change being the only difference.

2. Certain upgrades require reapplying the CRDs since Helm does not maintain the lifecycle of CRDs. Please see the [official documentations](https://karpenter.sh/v0.16.0/upgrade-guide/#custom-resource-definition-crd-upgrades) for details.

3. Starting with v0.17.0, Karpenter's Helm chart package is stored in OCI (Open Container Initiative) registry. With this change, [charts.karpenter.sh](https://charts.karpenter.sh/) is no longer updated to preserve older versions. You have to adjust for the following:

* The full URL needs to be present (including 'oci://').
* You need to append a `v` to the version number (i.e. v0.17.0, not 0.17.0)

4. Starting with v0.22.0, Karpenter will no longer work on Kubernetes version prior to 1.21. Either upgrade your Kubernetes to 1.21 or later version and apply Karpenter, or use prior Karpenter versions.