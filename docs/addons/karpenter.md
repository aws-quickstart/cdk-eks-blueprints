# Karpenter Add-on

Karpenter add-on is based on the [Karpenter](https://github.com/aws/karpenter) open source node provisioning project. It provides a more efficient and cost-effective way to manage workloads by launching just the right compute resources to handle a cluster's application. 

Karpenter works by:

* Watching for pods that the Kubernetes scheduler has marked as unschedulable,
* Evaluating scheduling constraints (resource requests, nodeselectors, affinities, tolerations, and topology spread constraints) requested by the pods,
* Provisioning nodes that meet the requirements of the pods,
* Scheduling the pods to run on the new nodes, and
* Removing the nodes when the nodes are no longer needed

## Prerequisite

Here are the prerequisites:
1. Karpenter discovers subnets tagged `kubernetes.io/cluster/$CLUSTER_NAME`. Private subnets where the EKS cluster is deployed shoule be tagged as such.
2. (If using Spot), EC2 Spot Service Linked Role should be created. See [here](https://docs.aws.amazon.com/batch/latest/userguide/spot_fleet_IAM_role.html) for more details.

## Usage

```typescript
import * as ssp from '@aws-quickstart/ssp-amazon-eks';

const app = new cdk.App();
const account = <AWS_ACCOUNT_ID>;
const region = <AWS_REGION>;
const env: { account, region },

const blueprint = ssp.EksBlueprint.builder()
  .account(account) 
  .region(region)
  .addOns( new ssp.addons.KarpenterAddOn() )
  .teams().build(app, 'my-stack-name', {env});
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
4. Deploys Karpenter helm chart in the `karpenter` namespace, configuring cluster name and cluster endpoint on the controller by default.
5. (Optionally) provision a default Karpenter Provisioner CRD based on user-provided [spec.requirements](https://karpenter.sh/docs/provisioner/#specrequirements)

## Using Karpenter

To use Karpenter, you need to provision a Karpenter [provisioner CRD](https://karpenter.sh/docs/provisioner/). A single provisioner is capable of handling many different pod shapes.

This can be done in 2 ways (either will yield the same provisioner):

1. Provide a sec of spec.requirements during add-on deployment:

```typescript
const provisionerSpecs = {
    'node.kubernetes.io/instance-type': ['m5.2xlarge'],
    'topology.kubernetes.io/zone': ['us-east-1c'],
    'kubernetes.io/arch': ['amd64','arm64'],
    'karpenter.sh/capacity-type': ['spot','on-demand'],
}

const karpenterAddOn = new ssp.addons.KarpenterAddOn({defaultProvisionerSpecs: provisionerSpecs})
```

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
  ttlSecondsAfterEmpty: 30
EOF
```

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