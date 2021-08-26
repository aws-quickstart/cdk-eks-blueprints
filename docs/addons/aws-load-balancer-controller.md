# AWS Load Balancer Controller add-on
The AWS Load Balancer Controller manages Elastic Load Balancing for Kubernetes clusters. The controller provisions the following resources:

- An Application Load Balancer when you create Kubernetes inbound traffic.

- A Network Load Balancer when you create a Kubernetes service of type `LoadBalancer`. Previously, Kubernetes used an in-tree load balancer for instance targets and the AWS Load Balancer Controller for IP targets. With the AWS Load Balancer Controller (version 2.2.0 or later), you can create Network Load Balancers using either target type. For more information, see [Target type](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#target-type) in the User Guide for Network Load Balancers. For more information, see [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html).

This controller is required for proper configuration of other inbound controllers, such as NGINX.

## Usage

```typescript
import { AwsLoadBalancerControllerAddon }  from '@shapirov/cdk-eks-blueprint';

readonly awsLoadBalancerController = new AwsLoadBalancerControllerAddon({version: '2.2.0'});// optionally specify image version to pull  or empty constructor
const addOns: Array<ClusterAddOn> = [ awsLoadBalancerController ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```
Ensure that the controller state is `RUNNING`:

```bash
# Assuming controller is installed in kube-system namespace
$ kubectl get deployments -n kube-system
NAME                                                       READY   UP-TO-DATE   AVAILABLE   AGE
aws-load-balancer-controller                               2/2     2            2           3m58s
```
You can now provision NLB and ALB load balancers. For example to provision an NLB you can use the following service manifest:

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout: '60'
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
  name: udp-test1
spec:
  type: LoadBalancer
  ports:
  - port: 5005
    protocol: UDP
    targetPort: 5005
  selector:
    name: your-app
```

## Functionality

1. Adds proper AWS Identity and Access Management (IAM) permissions and creates a Kubernetes service account with IRSA integration. 
2. Allows you to configure options, such as enabling WAF and Shield. 
3. If you need a specific controller version, it allows you to replace the helm-chart version.

