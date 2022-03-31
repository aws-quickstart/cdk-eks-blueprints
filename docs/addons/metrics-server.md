# Metrics Server AddOn

[Metrics Server](https://github.com/kubernetes-sigs/metrics-server)  is a scalable, efficient source of container resource metrics for Kubernetes built-in autoscaling pipelines. It is not deployed by default in Amazon EKS clusters. The Metrics Server is commonly used by other Kubernetes add ons, such as the [Horizontal Pod Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/horizontal-pod-autoscaler.html), [Vertical Autoscaling](https://docs.aws.amazon.com/eks/latest/userguide/vertical-pod-autoscaler.html) or the [Kubernetes Dashboard](https://docs.aws.amazon.com/eks/latest/userguide/dashboard-tutorial.html).

> **Important**: Don't use Metrics Server when you need an accurate source of resource usage metrics or as a monitoring solution.

## Usage

#### **`index.ts`**
```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.MetricsServerAddOn('v0.5.0');

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Once deployed, you can see metrics-server pod in the `kube-system` namespace.

```sh
$ kubectl get deployments -n kube-system

NAME                                                          READY   UP-TO-DATE   AVAILABLE   AGE
blueprints-addon-metrics-server                               1/1     1            1           20m
```

## Functionality

1. Deploys the metrics-server helm chart in `kube-system` namespace by default.
2. Supports [standard helm configuration options](./index.md#standard-helm-add-on-configuration-options).

## Testing with Kubernetes Dashboard

For testing, we will use the [Kubernetes Dashboard](https://docs.aws.amazon.com/eks/latest/userguide/dashboard-tutorial.html) to view CPU and memory metrics of our cluster.

Apply the kubernetes dashboard manifest.

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

Create a file called eks-admin-service-account.yaml with the text below. This manifest defines a service account and cluster role binding called eks-admin.

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

Apply the service account and cluster role binding to your cluster.

```sh
$ kubectl apply -f eks-admin-service-account.yaml

serviceaccount/eks-admin created
clusterrolebinding.rbac.authorization.k8s.io/eks-admin created
```

Retrieve an authentication token for the eks-admin service account. Copy the <authentication_token> value from the output. You use this token to connect to the dashboard.

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

Start the kubectl proxy.

```sh
$ kubectl proxy
```

Open the [dashboard](http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/#!/login) in your browser and login using the value for `token` above.

![dashboard](https://raw.githubusercontent.com/kubernetes/dashboard/master/docs/images/dashboard-ui.png)

>**Note**: It may take a few minutes before CPU and memory metrics appear in the dashboard
