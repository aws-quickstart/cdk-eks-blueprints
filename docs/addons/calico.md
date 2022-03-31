# Calico Add-on

[Project Calico](https://www.projectcalico.org/) is an open source networking and network security solution for containers, virtual machines, and native host-based workloads. To secure workloads in Kubernetes, Calico utilizes Network Policies. The `Calico` add-on adds support for Calico to an EKS cluster.

By default, the native [VPC-CNI plugin](https://docs.aws.amazon.com/eks/latest/userguide/pod-networking.html) for Kubernetes on EKS does not support Kubernetes Network Policies. Installing Calico (or alternate CNI provider) will enable customers to define and apply standard [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/) to their EKS cluster. 

Calico add-on supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CalicoAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

### Applying Network Policies

In the [Getting Started]() guide, we bootstrapped an EKS cluster with the workloads contained in the [`eks-blueprints-workloads` repository](https://github.com/aws-samples/eks-blueprints-workloads). Below, we will demonstrate how we can apply network policies to govern traffic between the workloads once Calico is installed.

To start, we can verify that there are no network policies in place in your EKS cluster.

```bash
kubectl get networkpolicy -A
```

This means that all resources within the cluster should be able to make ingress and egress connections with other resources within and outside the cluster. You can verify, for example, that you are able to ping a`team-burnham` pod from a `team-riker` pod. To do so, first retrieve the podIP from the `team-burnham` namespace.

```bash
BURNHAM_POD=$(kubectl get pod -n team-burnham -o jsonpath='{.items[0].metadata.name}') 
BURNHAM_POD_IP=$(kubectl get pod -n team-burnham $BURNHAM_POD -o jsonpath='{.status.podIP}')
```

Now you can start a shell from the pod in the `team-riker` namespace and ping the pod from `team-burnham` namespace:

```bash
RIKER_POD=$(kubectl -n team-riker get pod -o jsonpath='{.items[0].metadata.name}')
kubectl exec -ti -n team-riker $RIKER_POD -- sh
```

Note: since this opens a shell inside the pod, it will not have the environment variables saved above. You should retrieve the actual podIP from the environment variable `BURNHAM_POD_IP`.

With those actual values, curl the IP and port 80 of the pod from `team-burnham`:

```bash
# curl -s <Team Burnham Pod IP>:80>/dev/null && echo Success. || echo Fail. 
```

You should see `Success.`

### Applying Kubernetes Network Policy to block traffic

Let's apply the following Network Policy:

```yaml
kind: NetworkPolicy
apiVersion: networking.k8s.io/v1
metadata:
  name: default-deny
spec:
  podSelector:
    matchLabels: {}
```

Save it as `deny-all.yaml`. Run the following commands to apply the policy to both `team-riker` and `team-burnham` namespaces:

```bash
kubectl -n team-riker apply -f deny-all.yaml 
kubectl -n team-burnham apply -f deny-all.yaml
```

This will prevent access to all resources within both namespaces. Try curl commands from above to verify that it fails.

### Applying additional policy to re-open pod to pod communications

You can apply a new Kubernetes Network Policy on top of the previous to “poke holes” for egress and ingress needs. 

For example, if you want to be able to curl from the `team-riker` pod to the `team-burnham` pod, the following Kubernetes NetworkPolicy should be applied. 

```yaml
kind: NetworkPolicy
apiVersion: networking.k8s.io/v1
metadata:
  namespace: team-burnham
  name: allow-riker-to-burnham
spec:
  podSelector:
    matchLabels:
      app: guestbook-ui
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: guestbook-ui
          namespaceSelector:
            matchLabels:
              name: team-riker
      ports:
        - protocol: TCP
          port: 80
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: guestbook-ui
          namespaceSelector:
            matchLabels:
              name: team-riker
      ports:
        - protocol: TCP
          port: 80
```

Save as `allow-burnham-riker.yaml` and apply the new NetworkPolicy:

```bash
kubectl apply -f allow-burnham-riker.yaml     
```

Once the policy is applied, once again try the curl command from above. You should now see `Success.` once again.

## Securing your environment with Kubernetes Network Policies

Calico also allows Custom Resource Definitions (CRD) which provides the ability to add features not in the standard Kubernetes  Network Policies, such as:

- Explicit Deny rules
- Layer 7 rule support (i.e. Http Request types)
- Endpoint support other than standard pods: OpenShift, VMs, interfaces, etc. 

In order to use CRDs (in particular defined within the *projectcalico.org/v3* Calico API), you must install the Calico CLI ([calicoctl](https://docs.projectcalico.org/getting-started/clis/calicoctl/install)). You can find more information about Calico Network Policy and using `calicoctl` [here](https://docs.projectcalico.org/security/calico-network-policy). 
