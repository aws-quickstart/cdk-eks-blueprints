# AWS Systems Manager Agent add-on

The AWS Systems Manager Agent (SSM Agent) add-on uses the Kubernetes DaemonSet resource type to install SSM Agent on all worker nodes. The advantage to this is that you can avoid manually installing or replacing the Amazon Machine Image (AMI) for the nodes. DaemonSet uses CronJob on the worker node to schedule the SSM Agent installation.

A common use case for installing SSM Agent on the worker nodes is opening a terminal session on an instance without the need to create a bastion instance or installing Secure Shell (SSH) keys on the worker nodes.

The IAM role `AmazonSSMManagedInstanceCore` provides the required permissions for SSM Agent to run on Amazon EC2 instances. When SSM Agent is enabled, the managed role is automatically attached to your instances.

**Limitations**

* This add-on applies only to Linux-based worker nodes.

* This add-on is not applicable to AWS Fargate because DaemonSets are not supported on the Fargate platform.

* DaemonSet pods run in privileged mode. If the Amazon EKS cluster has a webhook that blocks pods in privileged mode, the SSM Agent is not installed.

* Only the latest version of SSM Agent is installed.

## Usage

```typescript
import { SSMAgentAddOn, ClusterAddOn, EksBlueprint }  from '@aws-quickstart/ssp-amazon-eks';

const addOn = new SSMAgentAddon();
const addOns: Array<ClusterAddOn> = [ addOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

To validate that SSM Agent is running on worker node instances, follow these steps:

> **Prerequisite**: Install Session Manager for the AWS CLI. For more information, see [Install the Session Manager plugin for the AWS CLI](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html).

1. Obtain the Amazon EC2 instance ID of a worker node:
```bash
instance_id=$(kubectl get nodes -o custom-columns=NAME:.metadata.name,INSTANCEID:.spec.providerID | awk -F/ 'FNR == 2 {print $5}')
```
2. Use the `start-session` API to open a terminal for the instance:
```bash
aws ssm start-session --target $instance_id
```

### Use case for private clusters

If you disable public access for your Amazon EKS cluster endpoint, such that the cluster endpoint is provisioned as private only (that is, `endpointPublicAccess=false` and `endpointPrivateAccess=true`), use one of the worker nodes as a TCP jump box to your EKS cluster API.

Set up a TCP tunnel with your worker node as a jump box:

1. Use the SSM `send-command` API to create a TCP tunnel to the cluster API through Socat:
```bash
# Retreive the cluster API endpoint first.
CLUSTER_NAME=<insert your cluster name, e.g. blueprint-construct-dev>

CLUSTER_API=$(aws eks describe-cluster --name $CLUSTER_NAME | jq -r '.cluster.endpoint' | awk -F/ '{print $3}')

aws ssm send-command \
  --instance-ids $instance_id \
  --document-name "AWS-RunShellScript" \
  --comment "tcp tunnel to cluster api" \
  --parameters commands="nohup sudo socat TCP-LISTEN:443\,fork TCP:$CLUSTER_API:443 &"
```
2. Update `~/.kube/config` to use port `8443` as your local host instead of `443`. Depending on your network configuration, you may not be able to bind to port `443`, in which a case you can bind to port `8443`.
```bash
sed -i -e "s/https:\/\/$CLUSTER_API/https:\/\/$CLUSTER_API:8443/" ~/.kube/config
```
3. Update `/etc/hosts` so that `$CLUSTER_API` resolves to `127.0.0.1`.
```bash
sudo echo "127.0.0.1 $CLUSTER_API" >> /etc/hosts
```
4. Start an SSM session to forward remote port `443` to local port `8443`:
```bash
aws ssm start-session \
  --target $instance_id \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["443"], "localPortNumber":["8443"]}'
```

You can now execute Kubectl commands against your cluster API from another terminal window.

### Limitations

* This approach cannot be used for AWS Fargate or BottleRocket.
* Socat is available as an EKS-optimized AMI but may need to be manually installed on other AMIs.
