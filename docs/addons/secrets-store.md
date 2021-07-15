# Secrets Store Add-on

The Secrets Store Add-on provisions the [AWS Secrets Manager and Config Provider for Secret Store CSI Driver(ASCP)](https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_csi_driver.html) on your EKS cluster. With ASCP, you now have a plugin for the industry-standard Kubernetes Secrets Store [Container Storage Interface (CSI) Driver](https://github.com/kubernetes-sigs/secrets-store-csi-driver) used for providing secrets to applications operating on Amazon Elastic Kubernetes Service.

With ASCP, you can securely store and manage your secrets in [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager) or [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) and retrieve them through your application workloads running on Kubernetes. You no longer have to write custom code for your applications.

> **Compatibility**: This addon is only compatible with following Cluster Providers.<br/> [EC2 Cluster Provider](./../cluster-providers/ec2-cluster-provider.md)

## Usage

#### **`index.ts`**
```typescript
import { SecretsStoreAddOn, ClusterAddOn, EksBlueprint }  from '@shapirov/cdk-eks-blueprint';

const secretsStoreAddOn = new SecretsStoreAddOn({
  rotationPollInterval: '120s',
  providerConfig: [
    {
      namespace: 'team-riker',
      secrets: [
        {
          secretName: 'mysecret',
          secretType: ssp.SecretType.SECRETSMANAGER
        }
      ]
    }
  ]
});
const addOns: Array<ClusterAddOn> = [ secretsStoreAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: { 
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

## Functionality

1. Installs the [Kubernetes Secrets Store CSI Driver](https://github.com/kubernetes-sigs/secrets-store-csi-driver) in the `kube-system` namespace.
2. Installs [AWS Secrets Manager and Config Provider for Secret Store CSI Driver](https://github.com/aws/secrets-store-csi-driver-provider-aws) in the `kube-system` namespace.
3. Create an IAM access policy for scoped down to just the secrets the provided namespace should have access to.
4. Create an [IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/create-service-account-iam-policy-and-role.html) to be used and associate the above IAM policy with that service account.
5. Create the [SecretProviderClass](https://github.com/aws/secrets-store-csi-driver-provider-aws#secretproviderclass-options) which tells the AWS provider which secrets can be mounted in an application pod in the provided namespace.

## Security Considerations

The AWS Secrets Manger and Config Provider provides compatibility for legacy applications that access secrets as mounted files in the pod. Security conscious appliations should use the native AWS APIs to fetch secrets and optionally cache them in memory rather than storing them in the file system.