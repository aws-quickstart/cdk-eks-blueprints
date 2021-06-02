# Container Insights Addon

The `ContainerInsights` addon adds support for [Container Insights](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy-container-insights-EKS.html) to an EKS cluster.

Customers can use Container Insights to collect, aggregate, and summarize metrics and logs from your containerized applications and microservices.

## Usage

```typescript
import { AddOns }  from '@shapirov/cdk-eks-blueprint';

const myClusterAutoscaler = new AddOns.ContainerInsights();
const addOns: Array<ClusterAddOn> = [ myClusterAutoscaler ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

