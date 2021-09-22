# Calico Add-on

The `Calico` add-on provides support for Kubernetes network policies for EKS clusters.

[Project Calico](https://www.projectcalico.org/) is an open-source networking and network-security solution for containers, virtual machines, and native host-based workloads. To secure workloads in Kubernetes, Calico uses network policies that are described in the following sections.

## Usage

```typescript
import { addons }  from '@shapirov/cdk-eks-blueprint';

const myCalicoCNI = new addon.CalicoAddon();
const addOns: Array<ClusterAddOn> = [ myCalicoCNI ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```
## Secure your environment using Kubernetes network policies

By default, the native VPC CNI add-on does not support Kubernetes network policies. Installing Calico (or other CNI provider) for network policy support means customers can define and apply standard [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/). 

Calico also, however, allows Custom Resource Definitions (CRD) that provide the ability to add features that are not in the standard Kubernetes policies, such as the following:
- Explicit deny rules
- Layer 7 rule support (i.e., HTTP request types)
- Endpoint support other than standard pods, such as OpenShift, VMs, and interfaces. 

To use CRDs (in particular, those defined within the *projectcalico.org/v3* Calico API), install [Calico CLI](https://docs.projectcalico.org/getting-started/clis/calicoctl/install). For more information, see [Get started with Calico network policy](https://docs.projectcalico.org/security/calico-network-policy). 

The following section discusses how to use `kubectl` to apply standard Kubernetes network policies.

### Pod-to-pod communications with no policies

If you use Argo CD to deploy workloads, verify that there are no network policies in place. For more information, see [Deploy workloads with Argo CD](https://github.com/aws-quickstart/quickstart-ssp-amazon-eks/blob/feature/calico/docs/getting-started.md#deploy-workloads-with-argocd).

```bash
kubectl get networkpolicy -A
```

This means that any resources within the cluster should be able to make inbound and outbound connections with other resources within and outside the cluster. For example, verify that you can ping from the `team-riker` pod to the `team-burnham` pod:

Retrieve the pod name from the `team-burnham` namespace:

```bash
BURNHAM_POD=$(kubectl get pod -n team-burnham -o jsonpath='{.items[0].metadata.name}') 
BURNHAM_POD_IP=$(kubectl get pod -n team-burnham $BURNHAM_POD -o jsonpath='{.status.podIP}')
```

Start a shell from the pod in the `team-riker` namespace. and ping the pod from `team-burnham` namespace:

```bash
RIKER_POD=$(kubectl -n team-riker get pod -o jsonpath='{.items[0].metadata.name}')
kubectl exec -ti -n team-riker $RIKER_POD -- sh
```

Note: This opens a shell inside the pod that does not have your saved environment variables. Retrieve the actual pod IP from the environment variable `BURNHAM_POD_IP`.

With the returned values, use curl to retrieve the IP and port 80 of the pod from `team-burnham`:

```bash
# curl -s <Team Burnham Pod IP>:80>/dev/null && echo Success. || echo Fail. 
```

It should return `Success`.

### Applying a Kubernetes network policy to block traffic

Apply the following network policy:

```yaml
kind: NetworkPolicy
apiVersion: networking.k8s.io/v1
metadata:
  name: default-deny
spec:
  podSelector:
    matchLabels: {}
```

Save it as `deny-all.yaml`, and run the following commands to apply the policy to both the `team-riker` and `team-burnham` namespaces:

```bash
kubectl -n team-riker apply -f deny-all.yaml 
kubectl -n team-burnham apply -f deny-all.yaml
```

This prevents access to all resources within both namespaces. To verify that it fails, use the previous curl commands.

### Applying additional policy to re-open pod to pod communications

You can apply Kubernetes NetworkPolicy on top of that to “poke holes” for egress and ingress needs. 

For example, if you want to use curl from the `team-riker` pod to the `team-burnham` pod, apply the following Kubernetes network policy. 

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

Save it as `allow-burnham-riker.yaml`, and apply the new network policy:

```bash
kubectl apply -f allow-burnham-riker.yaml     
```

After you apply the policy, test it again using the curl command. It should return `Success`.
