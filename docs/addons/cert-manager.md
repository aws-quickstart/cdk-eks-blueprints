# Certificate Manager Add-on

This add-on installs [cert-manager](https://github.com/cert-manager/cert-manager).

cert-manager adds certificates and certificate issuers as resource types in Kubernetes clusters, and simplifies the process of obtaining, renewing and using those certificates.
Add-on can issue certificates from a variety of supported sources, including Let's Encrypt, HashiCorp Vault, and Venafi as well as private PKI.
It will ensure certificates are valid and up to date, and attempt to renew certificates at a configured time before expiry.

## Usage

```typescript

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CertManagerAddOn()

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `installCRDs`: (boolean) To automatically install and manage the CRDs as part of your Helm release,
- `createNamespace`: (boolean) If you want CDK to create the namespace for you
- `values`: Arbitrary values to pass to the chart. Refer to the cert-manager [Helm Chart documentation](https://artifacthub.io/packages/helm/cert-manager/cert-manager) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options)

## cert-manager compatibility with EKS and Fargate

Please refer to the cert-manager compatibility and open issues with EKS and Fargate
[cert-manager compatibility with EKS](https://cert-manager.io/docs/installation/compatibility/#aws-eks_

## Validation

To validate that cert-manager is installed properly in the cluster, check if the namespace is created and cert-manger pods are running.

Verify if the namespace is created correctly
```bash
  kubectl get ns | grep "cert-manager"
```
There should be list the cert-manager namespace
```bash
cert-manager      Active   31m
```
Verify if the pods are running correctly in cert-manager namespace
```bash
  kubectl get pods -n cert-manager  
```
There should list 3 pods starting with name cert-manager-
For Eg:
```bash
NAME                                      READY   STATUS    RESTARTS   AGE
cert-manager-5bb7949947-vxf76             1/1     Running   0          2m56s
cert-manager-cainjector-5ff98c66d-g4kpv   1/1     Running   0          2m56s
cert-manager-webhook-fb48856b5-bpsbl      1/1     Running   0          2m56s
```

## Testing

Cert-Manager Kubectl Plugin
Cert-Manager has a Kubectl plugin that simplifies some common management tasks. It also lets you check whether Cert-Manager is up and ready to serve requests.

Install Cert-Manager Kubectl Plugin
```bash
  curl -L -o kubectl-cert-manager.tar.gz https://github.com/jetstack/cert-manager/releases/latest/download/kubectl-cert_manager-linux-amd64.tar.gz
  tar xzf kubectl-cert-manager.tar.gz
  sudo mv kubectl-cert_manager /usr/local/bin
```

Run the follwing command to check if the plugin was correctly installed:
```bash
  kubectl cert-manager check api
```
This should print following message "The cert-manager API is ready"