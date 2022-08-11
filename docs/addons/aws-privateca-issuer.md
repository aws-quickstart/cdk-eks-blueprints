# AWS Private CA Issuer Add-on
This addon will install [aws-privateca-issuer](https://github.com/cert-manager/aws-privateca-issuer/)

AWS ACM Private CA is a module of the AWS Certificate Manager that can setup and manage private CAs.
The AWS PrivateCA Issuer plugin acts as an addon to cert-manager that signs certificate requests using ACM Private CA.

Since its an addon to cert-manager, for Installing AWS ACM Private CA Addon, You must install [cert-manager](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/cert-manager.md) Addon first

[cert-manager](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/cert-manager.md) is a Kubernetes add-on to automate the management and issuance of TLS certificates from various issuing sources. It will ensure certificates are valid and up to date periodically, and attempt to renew certificates at an appropriate time before expiry.
## Usage
Please ensure that [cert-manager](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/cert-manager.md) addon is already installed

```typescript

import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
const awsPcaParams = {
  iamPolicies: ["AWSCertificateManagerPrivateCAFullAccess"]
}
const addOn = new blueprints.addons.AWSPrivateCAIssuerAddon(awsPcaParams)

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Configuration Options

- `serviceAccountName`: (string) User provided name for service account. The default value is aws-pca-issuer
- `iamPolicies` - An array of Managed IAM Policies which Service Account needs for IRSA Eg: irsaRoles:["AWSCertificateManagerPrivateCAFullAccess"]. If not empty the Service Account will be created by the CDK with IAM Roles Mapped (IRSA). In case if its empty,  Service Account will be created with out default IAM Policy - "AWSCertificateManagerPrivateCAFullAccess"
- `values`: Arbitrary values to pass to the chart. Refer to the aws-pca-issuer [Helm Chart Values](https://github.com/cert-manager/aws-privateca-issuer/blob/main/charts/aws-pca-issuer/values.yaml) for additional details. It also supports all standard helm configuration options ( for Eg: https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/docs/addons/index.md#standard-helm-add-on-configuration-options)

## cert-manager compatibility with EKS and Fargate
Please refer to the cert-manager compatibility and open issues with EKS and Fargate
[cert-manager compatibility with EKS](https://cert-manager.io/docs/installation/compatibility/#aws-eks_

## Validation

To validate that aws-pca-issuer is installed properly in the cluster, check if the namespace aws-pca-issuer is created 

Verify if the namespace is created correctly
```shell
  kubectl get ns | grep "aws-pca-issuer"
```
There should be list the pca namespace
```shell
aws-pca-issuer      Active   31m
```
Verify the objects under namespace aws-pca-issuer 
```shell
  kubectl get all -n aws-pca-issuer 
```
It should give results as below
For Eg:
```shell
NAME                                                       READY   STATUS    RESTARTS   AGE
pod/aws-pca-issuer-aws-privateca-issuer-7b9df7c7cc-vz8hw   1/1     Running   0          3m2s

NAME                                          TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)    AGE
service/aws-pca-issuer-aws-privateca-issuer   ClusterIP   172.20.17.134   <none>        8080/TCP   3m3s

NAME                                                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/aws-pca-issuer-aws-privateca-issuer   1/1     1            1           3m2s
```


## Testing

1) Create an ACM Private CA
For this testing [create](https://docs.aws.amazon.com/acm-pca/latest/userguide/PcaCreateCa.html#CA-procedures) a private certificate authority in ACM Private CA with RSA 2048 selected as the key algorithm. You can create a CA using the AWS console
Once your private CA is active note down the ARN

2) Create a K8s namespace for testing purpose
```shell
  kubectl create ns acm-pca-demo
```
3) Change the current context to namespace acm-pca-demo
```shell
  kubectl config set-context --current --namespace=acm-pca-demo
```
4) Create CRD AWSPCAIssuer with name demo-awspcs-issuer  >> AWSPCAIssuer.yaml

AWSPCAIssuer
This is a regular namespaced issuer that can be used as a reference in your Certificate CRs.
AWSPCAClusterIssuer
This CR is identical to the AWSPCAIssuer. The only difference being that it’s not namespaced and can be referenced from anywhere.

In thi example we will use  AWSPCAIssuer
Replace the arn
Replace ${AWS_REGION} with your target region and ${ARN} with the ARN of CM Private CA recieved from step 1
```yaml
---
apiVersion: awspca.cert-manager.io/v1beta1
kind: AWSPCAIssuer
metadata:
  name: demo-awspcs-issuer
  namespace: acm-pca-demo
spec:
  arn: ${ARN}
  region: ${AWS_REGION}
---
```
Apply the yaml file
```shell
  kubectl apply -f AWSPCAIssuer.yaml
```
Verify AWSPCAIssuer installed correctly
```shell
  kubectl describe AWSPCAIssuer 
```
Check the Events section and you must see the message Issuer verified if everything goes correct
```shell
 Normal  Verified  46s (x2 over 46s)  awspcaissuer-controller  Issuer verified
```
4) Create CRD Certificate with name rsa-cert-2048 for dns name rsa-2048.example.com  >> Certificate.yaml
For th formats other than 2048 check the [examples](https://github.com/cert-manager/aws-privateca-issuer/tree/main/config/examples/certificates)
```yaml
---
kind: Certificate
apiVersion: cert-manager.io/v1
metadata:
  name: rsa-cert-2048
spec:
  commonName: www.rsa-2048.example.com
  dnsNames:
    - www.rsa-2048.example.com
    - rsa-2048.example.com
  duration: 2160h0m0s
  issuerRef:
    group: awspca.cert-manager.io
    kind: AWSPCAIssuer
    name: demo-awspcs-issuer
  renewBefore: 360h0m0s
  secretName: rsa-example-cert-2048
  usages:
    - server auth
    - client auth
  privateKey:
    algorithm: "RSA"
    size: 2048
---
```
Apply the yaml file
```shell
  kubectl apply -f Certificate.yaml
```
Verify Certificate is installed correctly
```shell
  kubectl  get Certificates
```
It should output Ready as True as shown below
```shell
  NAME            READY   SECRET                  AGE
  rsa-cert-2048   True    rsa-example-cert-2048   31s
```
The actual certificate file is stored as a secret. To see the details of secret get the secret name
```shell
  k describe certificate | grep Secret
```
Output
```shell
  Secret Name:   rsa-example-cert-2048
```
Describe the secret to get the value
```shell
  kubectl describe secret rsa-example-cert-2048
```

## Troubleshooting
Please use kubectl get events for debugging. 
```shell
  kubectl get events  
```
Sample Output for Successfull Certificate Request
```shell
  5s          Normal   cert-manager.io   certificaterequest/rsa-cert-2048.io-zqftp   Certificate request has been approved by cert-manager.io
  2s          Normal   Issued            certificaterequest/rsa-cert-2048.io-zqftp   certificate issued
  5s          Normal   Issuing           certificate/rsa-cert-2048                Issuing certificate as Secret does not exist
  5s          Normal   Generated         certificate/rsa-cert-2048               Stored new private key in temporary Secret resource "rsa-cert-2048-k7zxv"
  5s          Normal   Requested         certificate/rsa-cert-2048                Created new CertificateRequest resource "rsa-cert-2048-zqftp"
  2s          Normal   Issuing           certificate/rsa-cert-2048                The certificate has been successfully issued
  8m22s       Normal   Verified          awspcaissuer/rsa-cert-2048               Issuer verified
  85s         Normal   Verified          awspcaissuer/rsa-cert-2048               Issuer verified
```