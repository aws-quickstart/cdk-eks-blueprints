# AWS Node Termination Handler

This project ensures that the Kubernetes control plane responds appropriately to events that can cause your EC2 instance to become unavailable, such as EC2 maintenance events, EC2 Spot interruptions, ASG Scale-In, ASG AZ Rebalance, and EC2 Instance Termination via the API or Console. If not handled, your application code may not stop gracefully, take longer to recover full availability, or accidentally schedule work to nodes that are going down. For more information see [README.md][https://github.com/aws/aws-node-termination-handler#readme].

The aws-node-termination-handler (NTH) can operate in two different modes: Instance Metadata Service (IMDS) or the Queue Processor. In the SSP, we provision the NTH in Queue Processor mode. This means that NTH will monitor an SQS queue of events from Amazon EventBridge for ASG lifecycle events, EC2 status change events, Spot Interruption Termination Notice events, and Spot Rebalance Recommendation events. When NTH detects an instance is going down, NTH uses the Kubernetes API to cordon the node to ensure no new work is scheduled there, then drain it, removing any existing work.

## Usage

```typescript
import { AwsNodeTerminationHandlerAddOn, ClusterAddOn, EksBlueprint }  from '@aws-quickstart/ssp-amazon-eks';

const addOn = new AwsNodeTerminationHandlerAddOn();
const addOns: Array<ClusterAddOn> = [ addOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

To validate that controller is running, ensure that controller deployment is in `RUNNING` state:

```bash
# Assuming handler is installed in kube-system namespace
$ kubectl get deployments -n kube-system
NAME                                 READY   UP-TO-DATE   AVAILABLE   AGE
aws-node-termination-handler         1/1     1            1           23m
```

## Functionality

1. Node group ASG tagged with `key=aws-node-termination-handler/managed`
2. AutoScaling Group Termination Lifecycle Hook
3. Amazon Simple Queue Service (SQS) Queue
4. Amazon EventBridge Rule
5. IAM Role for the aws-node-termination-handler Queue Processing Pods
6. Deploy the AWS Node Termination Handler helm chart
