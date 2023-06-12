# Grafana-Operator Add-on

The [grafana-operator](https://github.com/grafana-operator/grafana-operator#:~:text=The%20grafana%2Doperator%20is%20a,an%20easy%20and%20scalable%20way) is a Kubernetes operator built to help you manage your Grafana instances inside and outside Kubernetes. Grafana Operator makes it possible for you to manage and create Grafana dashboards, datasources etc. declaratively between multiple instances in an easy and scalable way. Using grafana-operator, it will be possible to add AWS data sources such as Amazon Managed Service for Prometheus, Amazon CloudWatch, AWS X-Ray to Amazon Managed Grafana and create Grafana dashboards on Amazon Managed Grafana from your Amazon EKS cluster. This enables customers to use our Kubernetes cluster to create and manage the lifecyle of resources in Amazon Managed Grafana in a Kubernetes native way. This ultimately enables us to use GitOps mechanisms using CNCF projects such as FluxCD to create and manage the lifecyle of resources in Amazon Managed Grafana.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.GrafanaOperatorAddon(),

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you.

- `values`: Arbitrary values to pass to the chart. Refer to the Grafana Operator [Helm Chart documentation](https://grafana-operator.github.io/grafana-operator/docs/installation/helm/) for additional details. It also supports all [standard helm configuration options](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options).

## Validation

To validate that Grafana Operator is installed properly in the cluster, check if the namespace is created and pods are running.

Verify if the namespace is created correctly
```bash
kubectl get ns | grep "grafana-operator"
```
There should be list the grafana-operator namespace
```bash
grafana-operator      Active   31m
```
Verify if everything is running correctly in the grafana-operator namespace
```bash
kubectl get all -n grafana-operator  
```
This should list 1 pod, 1 service, 1 deployment, and 1 replica-set starting with name grafana-operator 
For Eg:
```bash
NAME                                                READY   STATUS    RESTARTS   AGE
pod/grafana-operator-779956546b-q5tlf               2/2     Running   0          3m7s

NAME                                              TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/grafana-operator-metrics-service          ClusterIP   172.20.255.216   <none>        8443/TCP   3m7s

NAME                                           READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/grafana-operator               1/1     1            1           3m7s

NAME                                                      DESIRED   CURRENT   READY   AGE
replicaset.apps/grafana-operator-779956546b               1         1         1       3m7s
```

## Testing

Please refer to the AWS Blog [Using Open Source Grafana Operator on your Kubernetes cluster to manage Amazon Managed Grafana](https://aws.amazon.com/blogs/mt/using-open-source-grafana-operator-on-your-kubernetes-cluster-to-manage-amazon-managed-grafana/) on testing the following features :

- Setting up Grafana Identity to Amazon Managed Grafana.
- Adding AWS data sources such as Amazon Managed Service For Prometheus, Amazon CloudWatch, AWS X-Ray.
- Creating Grafana Dashboards on Amazon Managed Grafana with Grafana Operator.

