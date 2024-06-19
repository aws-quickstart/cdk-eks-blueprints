# Karpenter Add-on

Karpenter add-on is based on the [Karpenter](https://github.com/kubernetes-sigs/karpenter) open source node provisioning project. For this add-on, it will utilize the [AWS provider](https://github.com/aws/karpenter-provider-aws), to ensure a more efficient and cost-effective way to manage workloads by launching just the right compute resources to handle a cluster's application on your EKS cluster.

Karpenter works by:

* Watching for pods that the Kubernetes scheduler has marked as unschedulable,
* Evaluating scheduling constraints (resource requests, nodeselectors, affinities, tolerations, and topology spread constraints) requested by the pods,
* Provisioning nodes that meet the requirements of the pods,
* Scheduling the pods to run on the new nodes, and
* Removing the nodes when the nodes are no longer needed

## Prerequisites

1. There is no support for utilizing both Cluster Autoscaler **and** Karpenter. Therefore, any addons list that has both will result in an error `Deploying <name of your stack> failed due to conflicting add-on: ClusterAutoscalerAddOn.`.

2. (If using Spot), EC2 Spot Service Linked Role should be created. See [here](https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html) for more details.

3. [Amazon EKS cluster with supported Kubernetes version](https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html). Karpenter provides minimum supported Karpenter versions for each Kubernetes version in form of a matrix [here](https://karpenter.sh/docs/upgrading/compatibility/#compatibility-matrix).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';

const app = new cdk.App();

const karpenterAddOn = new blueprints.addons.KarpenterAddOn({
    version: 'v0.33.1',
    nodePoolSpec: {
      labels: {
          type: "karpenter-test"
      },
      annotations: {
          "eks-blueprints/owner": "young"
      },
      taints: [{
          key: "workload",
          value: "test",
          effect: "NoSchedule",
      }],
      requirements: [
          { key: 'node.kubernetes.io/instance-type', operator: 'In', values: ['m5.2xlarge'] },
          { key: 'topology.kubernetes.io/zone', operator: 'In', values: ['us-west-2a','us-west-2b', 'us-west-2c']},
          { key: 'kubernetes.io/arch', operator: 'In', values: ['amd64','arm64']},
          { key: 'karpenter.sh/capacity-type', operator: 'In', values: ['spot']},
      ],
      disruption: {
          consolidationPolicy: "WhenEmpty",
          consolidateAfter: "30s",
          expireAfter: "20m",
          budgets: [{nodes: "10%"}]
      }
    },
    ec2NodeClassSpec: {
      amiFamily: "AL2",
      subnetSelectorTerms: [{ tags: { "Name": "my-stack-name/my-stack-name-vpc/PrivateSubnet*" }}],
      securityGroupSelectorTerms: [{ tags: { "aws:eks:cluster-name": "my-stack-name" }}],
    },
    interruptionHandling: true,
});

const blueprint = blueprints.EksBlueprint.builder()
  .version(KubernetesVersion.V1_28)
  .addOns(karpenterAddOn)
  .build(app, 'my-stack-name');
```

The add-on automatically sets Helm Chart [values](https://github.com/aws/karpenter-provider-aws/tree/main/charts/karpenter#values), and it is **recommended** not to pass custom values for the following:
- settings.clusterName
- settings.interruptionQueue (if interruption handling is enabled)
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
4. Deploys Karpenter helm chart in the `karpenter` namespace, configuring the cluster name, endpoint, Instance Profile, and others necessary for functional addon.
5. If the user provides `nodePoolSpec` (and `ec2NodeClassSpec`), the addon will provisions a default Karpenter NodePool and EC2NodeClass CRDs. `nodePoolSpec` requires [requirements](https://karpenter.sh/docs/concepts/nodepools/#spectemplatespecrequirements) while `ec2NodeClassSpec` requires subnets and security groups. Based on what version of Karpenter you provide, you will need either `subnetSelector` and `securityGroupSelector` (for versions v0.31.x or down), or `subnetSelectorTerms` and `securityGroupSelectorTerms` (for versions v0.32.x and up).
6. As mentioned above, the CRDs installed will be different from v0.32.0, since Karpenter as a project graduated to beta in October 2023. This meant significant API changes, going from alpha to beta. The addon has reflected those changes and will deploy NodePool and EC2NodeClass for v1beta1 CRDs, versus Provisioner and AWSNodeTemplate for v1alpha5. You can read more about the changes in this [blog](https://aws.amazon.com/blogs/containers/karpenter-graduates-to-beta/). This addon can install the new CRDs by setting the `installCRDs` add-on option to true.

***NOTE: EKS Blueprints npm v1.14 and above introduces breaking changes to the addon. Please see [Upgrade Path](#upgrade-path) for more details.***

## Using Karpenter

To use Karpenter, you need to provision a Karpenter [NodePool](https://karpenter.sh/docs/concepts/nodepools/) and [EC2NodeClass](https://karpenter.sh/docs/concepts/nodeclasses/). NodePool sets constraints on the nodes that can be created by Karpenter and the pods that can run on those nodes. EC2NodeClass, once associated with a NodePool, will then provision those nodes (in the form of EC2 instances) based on the AWS specific settings. Multiple NodePools may point to the same EC2NodeClass.

This can be done in 2 ways:

1. Provide the properties as show in [Usage](#usage). If the NodePoolSpec is not provided, the addon will not deploy a NodePool or EC2NodeClass.

2. Use `kubectl` to apply a sample NodePool and EC2NodeClass:
```bash
cat <<EOF | kubectl apply -f -
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      nodeClassRef:
        name: default
---
apiVersion: karpenter.k8s.aws/v1beta1
kind: EC2NodeClass
metadata:
  name: default
spec:
  amiFamily: AL2
  subnetSelectorTerms:
    - tags:
        karpenter.sh/discovery: "${CLUSTER_NAME}"

  securityGroupSelectorTerms:
    # Select on any security group that has both the "karpenter.sh/discovery: ${CLUSTER_NAME}" tag
    # AND the "environment: test" tag OR any security group with the "my-security-group" name
    # OR any security group with ID "sg-063d7acfb4b06c82c"
    - tags:
        karpenter.sh/discovery: "${CLUSTER_NAME}"

  role: "KarpenterNodeRole-${CLUSTER_NAME}"

  userData: |
    echo "Hello world"    

  tags:
    team: team-a
    app: team-a-app

  metadataOptions:
    httpEndpoint: enabled
    httpProtocolIPv6: disabled
    httpPutResponseHopLimit: 2
    httpTokens: required

  blockDeviceMappings:
    - deviceName: /dev/xvda
      ebs:
        volumeSize: 100Gi
        volumeType: gp3
        iops: 10000
        encrypted: true
        kmsKeyID: "1234abcd-12ab-34cd-56ef-1234567890ab"
        deleteOnTermination: true
        throughput: 125
        snapshotID: snap-0123456789

  detailedMonitoring: true

EOF
```

If you choose to create NodePool and EC2NodeClass manually, you **MUST** provide the tags that match the subnet and the security group from the Blueprints EKS cluster that you plan to use.

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

The addon introduces breaking changes for Blueprints npm version v0.14 and later. Here are the details:

- EKS Blueprints will only support minimum Karpenter version that matches the supporter EKS Kubernetes version. Please see the compatibility matrix [here](https://karpenter.sh/docs/upgrading/compatibility/). If you provide incompatible version (i.e. providing version 0.27.x for EKS version 1.27), you will see warnings in the logs but will proceed deployment. You will run into compatibility issues.
- The add-on will no longer support any versions below v0.21.0
- User provided properties have been refactored to better reflect the parameters of the various Karpenter resources (i.e. NodePool, EC2NodeClass)
- For NodePool and EC2NodeClass, the parameters will apply to either the v1alpha5 CRDs ( provisioner, AWSNodeTemplate, for Karpenter versions v0.31.x or earlier) or v1beta1 CRDs (NodePool, EC2NodeClass, for Karpenter versions v0.32.x and later). **If you provide non-matching parameters, i.e. providing `consolidation` instead of `disruption` for Karpenter version v0.33.1, you will see an error with stack failing to provision.** Please consult the [upgrade guide](https://karpenter.sh/docs/upgrading/upgrade-guide/) to see the changes for various versions.
- To have the add-on install new CRDs after an initial install, set the `installCRDs` option to true.

If you are upgrading from earlier version of Blueprints and need to add the Karpenter addon, please ensure the following:

1. You are using the minimum Karpenter version supported by the Kubernetes version of your blueprint cluster. Not doing so will cause incompatibility issues.

2. Starting v0.32.0, Karpenter introduces the new beta APIs (v1beta1), and therefore the addon will make v1alpha5 CRDs obsolete. Ensure that you are providing the corresponding, matching parameters.