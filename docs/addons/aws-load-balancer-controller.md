# AWS Load Balancer Controller Add-on

The [AWS Load Balancer Controller](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html) manages AWS Elastic Load Balancers for a Kubernetes cluster. The controller provisions the following resources:

- An AWS Application Load Balancer (ALB) when you create a Kubernetes Ingress.
- An AWS Network Load Balancer (NLB) when you create a Kubernetes Service of type LoadBalancer. In the past, you used the Kubernetes in-tree load balancer for instance targets, but used the AWS Load balancer Controller for IP targets. With the AWS Load Balancer Controller version 2.2.0 or later, you can create Network Load Balancers using either target type. For more information about NLB target types, see [Target type](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html#target-type) in the User Guide for Network Load Balancers.

For more information about AWS Load Balancer Controller please see the [official documentation](https://docs.aws.amazon.com/eks/latest/userguide/aws-load-balancer-controller.html). This controller is a required for proper configuration of other ingress controllers such as NGINX.

## Usage

```typescript
import { AwsLoadBalancerControllerAddOn, ClusterAddOn, EksBlueprint }  from '@aws-quickstart/ssp-amazon-eks';

const addOn = new AwsLoadBalancerControllerAddon();
const addOns: Array<ClusterAddOn> = [ addOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>
  },
});
```

To validate that controller is running, ensure that controller deployment is in `RUNNING` state:

```bash
# Assuming controller is installed in kube-system namespace
$ kubectl get deployments -n kube-system
NAME                                                       READY   UP-TO-DATE   AVAILABLE   AGE
aws-load-balancer-controller                               2/2     2            2           3m58s
```

## Functionality

1. Adds proper IAM permissions and creates a Kubernetes service account with IRSA integration. 
2. Allows configuration options such as enabling WAF and Shield. 
3. Allows to replace the helm chart version if a specific version of the controller is needed.

## Creating a Load Balanced Service

Once the AWS Load Balancer Controller add-on is installed in your cluster, it is able to provision both Network Load Balancers and Application Load Balancers on your behalf. For example, when the following manifest is applied to your cluster, it will create an NLB.

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
