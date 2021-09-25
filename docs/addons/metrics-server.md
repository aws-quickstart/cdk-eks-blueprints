# Kubernetes Metrics Server add-on

[Kubernetes Metrics Server](https://github.com/kubernetes-sigs/metrics-server) is a scalable source of container metrics for Kubernetes autoscaling pipelines. It is not deployed by default in Amazon EKS clusters. The Metrics Server is commonly used by other Kubernetes add-ons, such as [Horizontal Pod Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/horizontal-pod-autoscaler.html), [Vertical Autoscaling](https://docs.aws.amazon.com/eks/latest/userguide/vertical-pod-autoscaler.html), and [Kubernetes Dashboard](https://docs.aws.amazon.com/eks/latest/userguide/dashboard-tutorial.html).

> **Important**: Do not use Metrics Server as a monitoring tool or for when you need accurate resource usage metrics.

## Usage

#### **`index.ts`**
```typescript
import { MetricsServerAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

# Deploy Metrics Server v0.5.0
const metricServerAddOn = new MetricsServerAddOn('v0.5.0');
const addOns: Array<ClusterAddOn> = [ metricServerAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

When deployed, you can see the `metrics-server` pod in the `kube-system` namespace.

```sh
$ kubectl get deployments -n kube-system

NAME                                                          READY   UP-TO-DATE   AVAILABLE   AGE
metrics-server                                                1/1     1            1           20m
```

## Functionality

1. Deploys Kubernetes Metrics Server for a given version using [components.yaml](https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml) in the `kube-system` namespace.

## Testing with Kubernetes dashboard

To view your cluster's CPU and memory metrics, use [Kubernetes Dashboard](https://docs.aws.amazon.com/eks/latest/userguide/dashboard-tutorial.html):

```sh
$ kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.0.5/aio/deploy/recommended.yaml

namespace/kubernetes-dashboard created
serviceaccount/kubernetes-dashboard created
service/kubernetes-dashboard created
secret/kubernetes-dashboard-certs created
secret/kubernetes-dashboard-csrf created
secret/kubernetes-dashboard-key-holder created
configmap/kubernetes-dashboard-settings created
role.rbac.authorization.k8s.io/kubernetes-dashboard created
clusterrole.rbac.authorization.k8s.io/kubernetes-dashboard created
rolebinding.rbac.authorization.k8s.io/kubernetes-dashboard created
clusterrolebinding.rbac.authorization.k8s.io/kubernetes-dashboard created
deployment.apps/kubernetes-dashboard created
service/dashboard-metrics-scraper created
deployment.apps/dashboard-metrics-scraper created
```

Use the following commands to create a file called `eks-admin-service-account.yaml`. This manifest defines a service account and cluster-role binding called `eks-admin`.

```sh
$ cat << 'EOF' >> eks-admin-service-account.yaml
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: eks-admin
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1beta1
kind: ClusterRoleBinding
metadata:
  name: eks-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
- kind: ServiceAccount
  name: eks-admin
  namespace: kube-system
EOF
```

Apply the service account and cluster-role binding:

```sh
$ kubectl apply -f eks-admin-service-account.yaml

serviceaccount/eks-admin created
clusterrolebinding.rbac.authorization.k8s.io/eks-admin created
```

Retrieve an authentication token for the `eks-admin` service account. Copy the <authentication_token> value from the output, and use the token to connect to the dashboard.

```sh
$ kubectl -n kube-system describe secret $(kubectl -n kube-system get secret | grep eks-admin | awk '{print $1}')

Name:         eks-admin-token-dwzb2
Namespace:    kube-system
Labels:       <none>
Annotations:  kubernetes.io/service-account.name: eks-admin
              kubernetes.io/service-account.uid: 6fb4eb46-553e-44bf-b0e7-9ae8f5f500d6

Type:  kubernetes.io/service-account-token

Data
====
ca.crt:     1066 bytes
namespace:  11 bytes
token:      XXXXXXXXXXXXXXXXXXXXXX
```

Start the Kubectl proxy:

```sh
$ kubectl proxy
```

In your browser, navigate to the [dashboard](http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/#!/login) and log in using the token value from the previous step.

![dashboard](https://raw.githubusercontent.com/kubernetes/dashboard/master/docs/images/dashboard-ui.png)

>**Note**: It may take a few minutes before CPU and memory metrics appear in the dashboard.
