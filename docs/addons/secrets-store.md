# Secrets Store Add-on

The Secrets Store Add-on provisions the [AWS Secrets Manager and Config Provider(ASCP) for Secret Store CSI Driver](https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_csi_driver.html) on your EKS cluster. With ASCP, you now have a plugin for the industry-standard Kubernetes Secrets Store [Container Storage Interface (CSI) Driver](https://github.com/kubernetes-sigs/secrets-store-csi-driver) used for providing secrets to applications operating on Amazon Elastic Kubernetes Service.

With ASCP, you can securely store and manage your secrets in [AWS Secrets Manager](https://docs.aws.amazon.com/secretsmanager) or [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html) and retrieve them through your application workloads running on Kubernetes. You no longer have to write custom code for your applications.

> **Compatibility**: This addon is only compatible with following Cluster Providers.<br/> [EC2 Cluster Provider](./../cluster-providers/ec2-cluster-provider.md)

## Usage

#### **`index.ts`**
```typescript
import * as cdk from '@aws-cdk/core';
import {
  SecretsStoreAddOn,
  SecretType,
  ClusterAddOn,
  EksBlueprint,
  ApplicationTeam
} from '@shapirov/cdk-eks-blueprint';

const secretsStoreAddOn = new SecretsStoreAddOn();
const addOns: Array<ClusterAddOn> = [ secretsStoreAddOn ];

// Setup application team with secrets
class TeamBurnham extends ApplicationTeam {
  constructor(scope: Construct) {
    super({
      name: "burnham",
      secrets: [
        {
          secretName: 'GITHUB_TOKEN',
          secretType: SecretType.SECRETSMANAGER
        }
      ]
    });
  }
}

const app = new cdk.App();
const teams: Array<ApplicationTeam> = [ new TeamBurnham(app) ];
new EksBlueprint(app, 'my-stack-name', addOns, teams, {
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

## Example

After the Blueprint stack is deployed you can test consuming the secret from within a `deployment`.

This sample `deployment` pulls an `alpine` image. We will mount the secrets under `/mnt/secrets-store` directory as shown in the manifest below.

```yaml
cat << 'EOF' >> test-secrets.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-deployment
  labels:
    app: myapp
  namespace: team-burnham
spec:
  replicas: 1
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      serviceAccountName: burnham-sa
      volumes:
      - name: secrets-store-inline
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "burnham-aws-secrets"
      containers:
      - name: app-deployment
        image: ubuntu
        command: [ "/bin/bash", "-c", "--" ]
        args: [ "while true; do sleep 30; done;" ]
        resources:
          limits:
            cpu: "100m"
            memory: "128Mi"
          requests:
            cpu: "100m"
            memory: "128Mi"
        ports:
        - containerPort: 80
        volumeMounts:
        - name: secrets-store-inline
          mountPath: "/mnt/secrets-store"
          readOnly: true
EOF
```

Test that the deployment has completed and the pod is running successfully.

```sh
$ kubectl get pods -n team-burnham
NAME                              READY   STATUS    RESTARTS   AGE
app-deployment-6867fc6bd6-jzdwh   1/1     Running   0          46s
```

Next, we can test whether the secret `GITHUB_TOKEN` has been successfully. We will use the `kubectl exec` command to print our secret to stdout.

```sh
$ kubectl exec app-deployment-6867fc6bd6-jzdwh -n team-burnham -- cat /mnt/secrets-store/GITHUB_TOKEN

XXXXXXXXXXXXXXX
```