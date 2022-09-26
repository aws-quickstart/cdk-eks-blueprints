# Kube State Metrics Add-on

This add-on installs [kube-state-metrics](https://github.com/kube-state-metrics/kube-state-metrics).

kube-state-metrics adds certificates and certificate issuers as resource types in Kubernetes clusters, and simplifies the process of obtaining, renewing and using those certificates.
Add-on can issue certificates from a variety of supported sources, including Let's Encrypt, HashiCorp Vault, and Venafi as well as private PKI.
It will ensure certificates are valid and up to date, and attempt to renew certificates at a configured time before expiry.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CertManagerAddOn()

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `createNamespace`: (boolean) If you want CDK to create the namespace for you
- `values`: Arbitrary values to pass to the chart. Refer to the kube-state-metrics [Helm Chart documentation](https://artifacthub.io/packages/helm/kube-state-metrics/kube-state-metrics) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options)

## kube-state-metrics compatibility with EKS and Fargate

Please refer to the kube-state-metrics compatibility and open issues with EKS and Fargate
[kube-state-metrics compatibility with EKS](https://kube-state-metrics.io/docs/installation/compatibility/#aws-eks_

## Validation

To validate that kube-state-metrics is installed properly in the cluster, check if the namespace is created and cert-manger pods are running.

Verify if the namespace is created correctly
```bash
  kubectl get ns | grep "kube-state-metrics"
```
There should be list the kube-state-metrics namespace
```bash
kube-state-metrics      Active   31m
```
Verify if the pods are running correctly in kube-state-metrics namespace
```bash
  kubectl get pods -n kube-state-metrics  
```
There should list 3 pods starting with name kube-state-metrics-
For Eg:
```bash
NAME                                      READY   STATUS    RESTARTS   AGE
kube-state-metrics-5bb7949947-vxf76             1/1     Running   0          2m56s
kube-state-metrics-cainjector-5ff98c66d-g4kpv   1/1     Running   0          2m56s
kube-state-metrics-webhook-fb48856b5-bpsbl      1/1     Running   0          2m56s
```

## Testing

kube-state-metrics Kubectl Plugin
kube-state-metrics has a Kubectl plugin that simplifies some common management tasks. It also lets you check whether kube-state-metrics is up and ready to serve requests.

Install kube-state-metrics Kubectl Plugin
```bash
  curl -L -o kubectl-kube-state-metrics.tar.gz https://github.com/jetstack/kube-state-metrics/releases/latest/download/kubectl-cert_manager-linux-amd64.tar.gz
  tar xzf kubectl-kube-state-metrics.tar.gz
  sudo mv kubectl-cert_manager /usr/local/bin
```

Run the follwing command to check if the plugin was correctly installed:
```bash
  kubectl kube-state-metrics check api
```
This should print following message "The kube-state-metrics API is ready"