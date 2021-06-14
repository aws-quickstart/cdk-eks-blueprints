# Calico Add-on

The `Calico` addon adds support for [Calico CNI](https://docs.projectcalico.org/about/about-calico) to an EKS cluster.

Calico is an open source networking and network security solution for containers, virtual machines, and native host-based workloads.To secure workloads in Kubernetes, Calico utilizes Network Policies.  

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

### Installing calicoctl

In order to use Calico Customer Resource Definitions (CRD), you need to install `calicoctl`. 
Follow the instructions found [here](https://docs.projectcalico.org/getting-started/clis/calicoctl/install), under *Install calicoctl as a binary on a single host* it will include instructions for your specific OS. You can test that calicoctl was installed correctly using the following:

```bash
calicoctl version
```

You should see output similar to the following:

```
Client Version:    v3.19.1
Git commit:        6fc0db96
Cluster Version:   v3.15.1
Cluster Type:      typha,kdd,k8s,ecs
```

### Pod to Pod communications with no policies

Looking at the app of apps installed using ArgoCD, currently there are no network policy. To verify this, run the following:

```bash
kubectl get networkpolicy -A
```
You should see the following output:

```
No resource found
```

This means that any resources within the cluster should be able to make ingress and egress connections with other resources within and outside the cluster. You can verify, for example, that you are able to ping from `team-riker` pod to `team-burnham` pod.

First we retrieve the pod name from `team-burnham` namespace and retrieve its DNS:

```bash
BURNHAM_POD=$(kubectl get pod -n team-burnham -o jsonpath='{.items[0].metadata.name}') 
BURNHAM_POD_IP=$(kubectl get pod -n team-burnham $BURNHAM_POD -o jsonpath='{.status.podIP}')
BURNHAM_POD_DEP=$(kubectl get deployments -n team-burnham -o jsonpath='{.items[0].metadata.name}')
```

Now we can get a shell from the pod in `team-riker` namespace and ping the pod from `team-burnham` namespace:

```bash
RIKER_POD=$(kubectl -n team-riker get pod -o jsonpath='{.items[0].metadata.name}')
kubectl exec --stdin --tty -n team-riker $RIKER_POD -- /bin/bash
```

Note: since this opens a shell inside the pod, it will not have the environment variable from your local shell. You should retrieve the actual podIP and the deployment name from the environment variables `BURNHAM_POD` and `BURNHAM_POD_DEP`.

With those actual values, ping the DNS of the pod from `team-burnham`:

```bash
root@kustomize-guestbook-ui-85985d774c-tvk6n:/var/www/html# ping <podIP>.<deployment name>.team-burnham.svc.cluster.local
```

You should see it pinging successfully:

```
PING 10-0-184-139.guestbook-ui.team-burnham.svc.cluster.local (10.0.184.139): 56 data bytes
64 bytes from 10.0.184.139: icmp_seq=0 ttl=254 time=0.101 ms
64 bytes from 10.0.184.139: icmp_seq=1 ttl=254 time=0.069 ms
64 bytes from 10.0.184.139: icmp_seq=2 ttl=254 time=0.069 ms
64 bytes from 10.0.184.139: icmp_seq=3 ttl=254 time=0.073 ms
```
### Applying Policies using Calico to block traffic

One of the powerful things about Calico is the ability to apply a Global Network Policy - policy across all namespaces.

Let's apply the following Global Network Policy:

```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: global-deny-all
spec:
  order: 2000
  types:
  - Ingress
  - Egress

  # egress network rules
  egress:
  # Allow all egress traffic from kube-system.
  - action: Allow
    destination: {}
    source:
      namespaceSelector: name == 'kube-system'

  # Allow egress DNS traffic to any destination.
  - action: Allow
    protocol: UDP
    destination:
      nets:
        - 0.0.0.0/0
      ports:
        - 53

  # ingress network rules
  ingress:
  # Allow all ingress traffic for the kube-system namespace.
  - action: Allow
    destination:
      namespaceSelector: name == 'kube-system'
    source: {}
```

You can either save it as `calico-global-deny-all.yaml` or copy the file in this directory. Run the following command to apply the policy:

```bash
DATASTORE_TYPE=kubernetes \
    KUBECONFIG=~/.kube/config
    calicoctl apply -f global-deny-all.yaml 
```

You should see the following:

```
Successfully applied 1 'GlobalNetworkPolicy' resource(s)
```

The policy blocks all egress and ingress traffic in namespaces except `kube-system`, with the exception of DNS traffic (UDP:53). 
You can try to ping the pod from `team-burnham` from a shell within the pod from `team-riker` and see that now you won't receive any response back.

### Applying additional policy to re-open pod to pod communications

The above GlobalNetworkPolicy removes the ability for pods to communicate with other pods in all namespaces except `kube-system`. 
However, you can still apply Kubernetes NetworkPolicy on top of that to “poke holes” for egress and ingress needs. 

For example, if you wanted to open all traffic between `team-burnham` and `team-riker`, the following Kubernetes NetworkPolicy could be applied.
