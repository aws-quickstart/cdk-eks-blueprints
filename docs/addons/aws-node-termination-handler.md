# AWS Node Termination Handler

The AWS Node Termination Handler (NTH) project ensures that the Kubernetes control plane responds appropriately to events that can cause your EC2 instance to become unavailable, such as EC2 maintenance events, EC2 Spot interruptions, ASG Scale-In, ASG AZ Rebalance, and EC2 Instance Termination via the API or Console. If not handled, your application code may not stop gracefully, take longer to recover full availability, or accidentally schedule work to nodes that are going down. For more information see [README.md][https://github.com/aws/aws-node-termination-handler#readme].

NTH can operate in two different modes: Instance Metadata Service (IMDS) or the Queue Processor. To choose the operating mode refer to this [table](https://github.com/aws/aws-node-termination-handler#which-one-should-i-use).

> **Best Practice** NTH should only be used when you are using **self-managed** node groups and self-managed node groups with Spot instances. For more information on why you do not need NTH on managed node groups see this [issue](https://github.com/aws/aws-node-termination-handler/issues/186) and [EKS Workshop](https://www.eksworkshop.com/beginner/150_spotnodegroups/spotlifecycle/#interruption-handling-in-spot-managed-node-groups) for detailed explanation.

> **Best Practice** Use NTH in Queue Processor option to add every AWS Node Termination Handler feature to the self-managed node group.

>**Note** With AWS Fargate, you no longer have to provision, configure, or scale clusters of virtual machines to run containers. This removes the need to use AWS Node Termination Handler.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AwsNodeTerminationHandlerAddOn();

const clusterProvider = new blueprints.AsgClusterProvider({
  version: eks.KubernetesVersion.V1_21,
  machineImageType:  eks.MachineImageType.BOTTLEROCKET
});

const blueprint = blueprints.EksBlueprint.builder()
  .clusterProvider(clusterProvider)
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

To validate that controller is running, ensure that controller deployment is in `RUNNING` state:

```bash
# Assuming handler is installed in kube-system namespace
$ kubectl get deployments -n kube-system
NAME                                 READY   UP-TO-DATE   AVAILABLE   AGE
aws-node-termination-handler         1/1     1            1           23m
```

## Functionality

### IMDS Mode (default)

1. Node group ASG tagged with `key=aws-node-termination-handler/managed`
2. Deploy the AWS Node Termination Handler helm chart

### Queue Mode

1. Node group ASG tagged with `key=aws-node-termination-handler/managed`
2. AutoScaling Group Termination Lifecycle Hook
3. Amazon Simple Queue Service (SQS) Queue
4. Amazon EventBridge Rule
5. IAM Role for the aws-node-termination-handler Queue Processing Pods
6. Deploy the AWS Node Termination Handler helm chart
