# Calico Add-on

The `Calico` addon adds support for Kubernetes Network Policies to an EKS cluster.

[Project Calico](https://www.projectcalico.org/) is an open source networking and network security solution for containers, virtual machines, and native host-based workloads. To secure workloads in Kubernetes, Calico utilizes Network Policies as we will see below.

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
## Securing your environment with Calico network policies

By default, installing Calico addon for network policy support will enable customers to define and apply standard [Kubernetes Network Policies](https://kubernetes.io/docs/concepts/services-networking/network-policies/). 
However, Calico also allows Custom Resource Definitions (CRD) which gives you the ability to add features not in the standard Kubernetes policies, such as:
- Explicit Deny rules
- Layer 7 rule support (i.e. Http Request types)
- Endpoint support other than standard pods: OpenShift, VMs, interfaces, etc. 

In order to use CRDs (in particular defined within the *projectcalico.org/v3* Calico API), you need to install the Calico CLI (`calicoctl`). More information for Calico CRDs are defined in the [Calico Policy](https://docs.projectcalico.org/security/calico-policy) section of the official documentations. 
You will look at how the standard Kubernetes Network Policies are applied in the following example. This will be done using `kubectl`.

### Pod to Pod communications with no policies

If you deploy [App of Apps installed using ArgoCD](https://github.com/aws-quickstart/quickstart-ssp-amazon-eks/blob/feature/calico/docs/getting-started.md#deploy-workloads-with-argocd), you can verify that there are no network policies in place:

```bash
kubectl get networkpolicy -A
```

This means that any resources within the cluster should be able to make ingress and egress connections with other resources within and outside the cluster. You can verify, for example, that you are able to ping from `team-riker` pod to `team-burnham` pod.

First we retrieve the pod name from the `team-burnham` namespace its podIP:

```bash
BURNHAM_POD=$(kubectl get pod -n team-burnham -o jsonpath='{.items[0].metadata.name}') 
BURNHAM_POD_IP=$(kubectl get pod -n team-burnham $BURNHAM_POD -o jsonpath='{.status.podIP}')
```

Now we can start a shell from the pod in the `team-riker` namespace and ping the pod from `team-burnham` namespace:

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

This will essentially prevent access to all resources within both namespaces. Try curl commands from above to verify that it fails.

### Applying additional policy to re-open pod to pod communications

You can apply Kubernetes NetworkPolicy on top of that to “poke holes” for egress and ingress needs. 

For example, if you wanted to be able to curl from the `team-riker` pod to the `team-burnham` pod, the following Kubernetes NetworkPolicy should be applied. 

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
