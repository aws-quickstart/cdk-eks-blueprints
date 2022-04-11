# SSM Agent Add-on

This add-on uses the Kubernetes DaemonSet resource type to install AWS Systems Manager Agent (SSM Agent) on all worker nodes, instead of installing it manually or replacing the Amazon Machine Image (AMI) for the nodes. DaemonSet uses a CronJob on the worker node to schedule the installation of SSM Agent.

A common use-case for installing SSM Agent on the worker nodes is to be able open a terminal session on an instance without the need to create a bastion instance and without having to install SSH keys on the worker nodes.

The AWS Identity and Access Management (IAM) managed role **AmazonSSMManagedInstanceCore** provides the required permissions for SSM Agent to run on EC2 instances. This role is automatically attached to the instances when this add-on is enabled.

**Limitations**

* This add-on isn't applicable to AWS Fargate, because DaemonSets aren't supported on the Fargate platform.

* This add-on applies only to Linux-based worker nodes.

* The DaemonSet pods run in privileged mode. If the Amazon EKS cluster has a webhook that blocks pods in privileged mode, the SSM Agent will not be installed.

* Only latest version of SSM Agent add-on can be installed.

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.SSMAgentAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

To validate that SSM Agent is running on worker node instance:

> **Pre-Requisite**: Install the Session Manager plugin for the AWS CLI as per [instructions](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) for your OS.

1. Get the EC2 Instance Id of a worker node

```bash
instance_id=$(kubectl get nodes -o custom-columns=NAME:.metadata.name,INSTANCEID:.spec.providerID | awk -F/ 'FNR == 2 {print $5}')
```

2. Use the `start-session` api to see if you can open a terminal into the instance

```bash
aws ssm start-session --target $instance_id
```

### Use Case: Private Clusters

If you are disabling public access for your EKS cluster endpoint such that the cluster endpoint is provisioned as private only i.e `endpointPublicAccess=false` and `endpointPrivateAccess=true`, then you can use one of the worker nodes as a TCP jump box to your EKS cluster api.

To set up a TCP tunnel with your worker node as a jump box:

1. Use SSM `send-command` api to create a TCP tunnel to Cluster API using `socat`:

```bash
# Get the Cluster API endpoint first
CLUSTER_NAME=<insert your cluster name, e.g. blueprint-construct-dev>

CLUSTER_API=$(aws eks describe-cluster --name $CLUSTER_NAME | jq -r '.cluster.endpoint' | awk -F/ '{print $3}')

aws ssm send-command \
  --instance-ids $instance_id \
  --document-name "AWS-RunShellScript" \
  --comment "tcp tunnel to cluster api" \
  --parameters commands="nohup sudo socat TCP-LISTEN:443\,fork TCP:$CLUSTER_API:443 &"
```

2. Update `~/.kube/config` to use port 8443 instead of 443 as your local host may not allow you to bind port 443 (depending on your machine network configuration you may not be able to bind to port 443. In such a case, you can bind to port 8443)

```bash
sed -i -e "s/https:\/\/$CLUSTER_API/https:\/\/$CLUSTER_API:8443/" ~/.kube/config
```

3. Update /etc/hosts so that `$CLUSTER_API` resolves to `127.0.0.1`.

```bash
sudo echo "127.0.0.1 $CLUSTER_API" >> /etc/hosts
```
4. Start an SSM session to forward remote port 443 to local port 8443:

```bash
aws ssm start-session \
  --target $instance_id \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["443"], "localPortNumber":["8443"]}'
```

At this point you should be able to execute `kubectl ...` commands against your cluster API from another terminal window.

**Limitations**

* This approach cannot be used for Fargate or BottleRocket based providers.
* `socat` is available on EKS optimized AMI out of the box but may have to be explicitly installed on others AMIs.
