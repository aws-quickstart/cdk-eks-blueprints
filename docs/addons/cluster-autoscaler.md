# Cluster Autoscaler Add-on

## Usage

```typescript
import { ClusterAutoScaler }  from '@shapirov/cdk-eks-blueprint';

readonly myClusterAutoscaler = new ClusterAutoscaler("v1.19.1");// optionally specify image version to pull  or empty constructor
const addOns: Array<ClusterAddOn> = [ myClusterAutoscaler ];

const app = new cdk.App();
new CdkEksBlueprintStack(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

## Functionality

1. Adds proper IAM permissions (such as modify autoscaling groups, terminate instances, etc.) to the NodeGroup IAM role. 
2. Configures service account, cluster roles, roles, role bindings and deployment.
3. Resolves proper CA image to pull based on the Kubernetes version.
4. Configuration allows passing a specific version of the image to pull.
5. Applies proper tags for discoverability to the EC2 instances.

