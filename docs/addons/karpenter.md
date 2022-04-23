# Karpenter Add-on

Karpenter add-on is based on the [Karpenter](https://github.com/aws/karpenter) open source node provisioning project. It provides a more efficient and cost-effective way to manage workloads by launching just the right compute resources to handle a cluster's application. 

Karpenter works by:

* Watching for pods that the Kubernetes scheduler has marked as unschedulable,
* Evaluating scheduling constraints (resource requests, nodeselectors, affinities, tolerations, and topology spread constraints) requested by the pods,
* Provisioning nodes that meet the requirements of the pods,
* Scheduling the pods to run on the new nodes, and
* Removing the nodes when the nodes are no longer needed

***IMPORTANT***: 

1. This add-on depends on [VPC CNI](vpc-cni.md) Add-on for cni support.

***VPC CNI add-on must be present in add-on array*** and ***must be in add-on array before the Karpenter add-on*** for it to work, as shown in below example. Otherwise will run into error `Assertion failed: Missing a dependency for VpcCniAddOn`.

2. There is no support for utilizing both Cluster Autoscaler **and** Karpenter. Therefore, any addons list that has both will result in an error `Deploying <name of your stack> failed due to conflicting add-on: ClusterAutoscalerAddOn.`. 

## Prerequisite

(If using Spot), EC2 Spot Service Linked Role should be created. See [here](https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html) for more details.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const karpenterAddonProps = {
  provisionerSpecs: {
    'node.kubernetes.io/instance-type': ['m5.2xlarge'],
    'topology.kubernetes.io/zone': ['us-east-1c'],
    'kubernetes.io/arch': ['amd64','arm64'],
    'karpenter.sh/capacity-type': ['spot','on-demand'],
  },
  subnetTags: {
    'karpenter.sh/discovery/MyCluster': 'Name',
    'karpenter.sh/discovery/Tag1': 'tag1value',
  },
  securityGroupTags: {
    'karpenter.sh/discovery/MyCluster': 'Name',
    'karpenter.sh/discovery/Tag1': 'tag1value',
  },
}
const vpcCniAddOn = new blueprints.addons.VpcCniAddOn();
const karpenterAddOn = new blueprints.addons.KarpenterAddOn(karpenterAddonProps);
const addOns: Array<blueprints.ClusterAddOn> = [ vpcCniAddOn, karpenterAddOn ];

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(...addOns)
  .build(app, 'my-stack-name');
```

The add-on automatically sets the following Helm Chart [values](https://github.com/aws/karpenter/tree/main/charts/karpenter#values), and it is **highly recommended** not to pass these values in (as it will result in errors):
- clusterEndpoint
- clusterName
- serviceAccount.create
- serviceAccount.name
- serviceAccount.annotations

To validate that Karpenter add-on is running ensure that the add-on deployments for the controller and the webhook are in `RUNNING` state:

```bash
# Assuming add-on is installed in the karpenter namespace.
$ kubectl get po -n karpenter
NAME                                          READY   STATUS    RESTARTS   AGE
blueprints-addon-karpenter-54fd978b89-hclmp   2/2     Running   0          99m
```

## Functionality

1. (Optionally) tag EKS VPC subnets and security group with user-provided tags.
2. Creates Karpenter Node Role, Karpenter Instance Profile, and Karpenter Controller Policy (Please see Karpenter documentation [here](https://karpenter.sh/docs/getting-started/) for more details on what is required and why).
3. Creates `karpenter` namespace.
4. Creates Kubernetes Service Account, and associate AWS IAM Role with Karpenter Controller Policy attached using [IRSA](https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-enable-IAM.html).
5. Deploys Karpenter helm chart in the `karpenter` namespace, configuring cluster name and cluster endpoint on the controller by default.
6. (Optionally) provisions a default Karpenter Provisioner CRD based on user-provided [spec.requirements](https://karpenter.sh/docs/provisioner/#specrequirements) and tags. 

**NOTE:**
1. The default provisioner is created only if both the subnet tags and the security group tags are provided. 
2. Provisioner spec requirement fields are not necessary, as karpenter will dynamically choose (i.e. leaving instance-type blank will let karpenter choose approrpriate sizing).

## Using Karpenter

To use Karpenter, you need to provision a Karpenter [provisioner CRD](https://karpenter.sh/docs/provisioner/). A single provisioner is capable of handling many different pod shapes.

This can be done in 2 ways:

1. Provide the following: Subnet tags, Security Group tags and provisioner specs.

```typescript
const provisionerSpecs = {
    'node.kubernetes.io/instance-type': ['m5.2xlarge'],
    'topology.kubernetes.io/zone': ['us-east-1c'],
    'kubernetes.io/arch': ['amd64','arm64'],
    'karpenter.sh/capacity-type': ['spot','on-demand'],
}

const subnetTags = {
    'karpenter.sh/discovery/MyCluster': 'Name',
    'karpenter.sh/discovery/Tag1': 'tag1value',
}

const sgTags = {
    'karpenter.sh/discovery/MyCluster': 'Name',
    'karpenter.sh/discovery/Tag1': 'tag1value',
}

const karpenterAddOn = new blueprints.addons.KarpenterAddOn({
  provisionerSpecs: provisionerSpecs,
  subnetTags: subnetTags,
  securityGroupTags: sgTags,
});
```

If either of the tags are not provided at deploy time, the add-on will be installed without a Provisioner. 

2. Use `kubectl` to apply a provisioner manifest:
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
    instanceProfile: KarpenterNodeInstanceProfile-${CLUSTER_NAME}
    subnetSelector:
      karpenter.sh/discovery/MyCluster: 'Name'
      karpenter.sh/discovery/Tag1: 'tag1value'
    securityGroupSelector:
      karpenter.sh/discovery/MyCluster: 'Name'
      karpenter.sh/discovery/Tag1: 'tag1value'
  ttlSecondsAfterEmpty: 30
EOF
```

If you choose to create a provisioner manually, you **MUST** tag the subnets and the EKS Security Group with the tags matching what is listed in the provisioner manifest.

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