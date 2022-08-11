# AWS Distro for OpenTelemetry (ADOT) Add-on

Amazon EKS supports using Amazon EKS API to install and manage the AWS Distro for OpenTelemetry (ADOT) Operator. This enables a simplified experience for instrumenting your applications running on Amazon EKS to send metric and trace data to multiple monitoring service options like Amazon CloudWatch, Prometheus, and X-Ray. 

This add-on is not automatically installed when you first create a cluster, it must be added to the cluster in order to manage ADOT Collectors.

For more information on the add-on, please review the [user guide](https://docs.aws.amazon.com/eks/latest/userguide/opentelemetry.html).

## Prerequisites
- The ADOT Operator uses admission webhooks to mutate and validate the Collector Custom Resource (CR) requests. In Kubernetes, the webhook requires a TLS certificate that the API server is configured to trust. There are multiple ways for you to generate the required TLS certificate. However, the default method is to install the latest version of the cert-manager. You can install Certificate Manager using this [user guide](https://cert-manager.io/docs/installation/helm/) or you can use `certificate-manager` EKS blueprints addon which should be added before ADOT addon.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.AdotCollectorAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate that ADOT add-on is installed properly, ensure that the ADOT kubernetes resources are running in the cluster

```bash
kubectl get all -n opentelemetry-operator-system
```

## Output
```bash
NAME                                                             READY   STATUS    RESTARTS   AGE
pod/opentelemetry-operator-controller-manager-845cbd7bf7-b5s9l   2/2     Running   0          140m

NAME                                                                TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)    AGE
service/opentelemetry-operator-controller-manager-metrics-service   ClusterIP   172.20.210.200   <none>        8443/TCP   140m
service/opentelemetry-operator-webhook-service                      ClusterIP   172.20.56.72     <none>        443/TCP    140m

NAME                                                        READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/opentelemetry-operator-controller-manager   1/1     1            1           140m

NAME                                                                   DESIRED   CURRENT   READY   AGE
replicaset.apps/opentelemetry-operator-controller-manager-845cbd7bf7   1         1         1       140m

```

## Testing
Additionally, the `aws cli` can be used to determine which version of the add-on is installed in the cluster.
```bash
# Assuming cluster-name is my-cluster, below command shows the version of coredns installed. Check if it is same as the version installed via EKS add-on
aws eks describe-addon \
    --cluster-name my-cluster \
    --addon-name adot \
    --query "addon.addonVersion" \
    --output text
    
# Output
v0.51.0-eksbuild.1
```  

## Functionality

Applies the ADOT add-on to an Amazon EKS cluster. 