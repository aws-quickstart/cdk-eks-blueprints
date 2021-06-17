# AWS App Mesh AddOn

AWS App Mesh is a service mesh that makes it easy to monitor and control services.The App Mesh addon provisions the necessary AWS resources and Helm charts into an EKS cluster needed to support App Mesh for EKS workloads. 

Full documentation on using App Mesh with EKS [can be found here](https://docs.aws.amazon.com/app-mesh/latest/userguide/getting-started-kubernetes.html).

## Usage

```typescript
import { AppMeshAddOn }  from '@shapirov/cdk-eks-blueprint';

const appMeshAddOn = new AppMeshAddOn();
const addOns: Array<ClusterAddOn> = [ appMeshAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {    
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

## Functionality

1. Configures an App Mesh IAM service account.
2. Adds both `AWSCloudMapFullAccess` and `AWSAppMeshFullAccess` roles to the service account.
3. Creates the `appmesh-system` namespace.
4. Deploys the [`appmesh-controller`](https://github.com/aws/eks-charts/tree/master/stable/appmesh-controller) Helm chart into the cluster.
