# Fluent Bit Add-on

[Fluent Bit](https://fluentbit.io/) is a popular Kubernetes log processor and forwarder. It is an open source projec which allows you to collect any data like metrics and logs from different sources, enrich them with filters and send them to multiple destinations.

Fluent Bit can be used to forward logs and metrics to multiple destinations including CloudWatch and AWS Managed Elasticsearch. This add-on leverages the [`aws-for-fluent-bit`](https://github.com/aws/eks-charts/tree/master/stable/aws-for-fluent-bit) Helm chart which is maintained in the [`EKS Charts`](https://github.com/aws/eks-charts) repository. 

## Usage with Elasticsearch 

The following code demonstrates how to use the `FluentBitAddOn` to forward logs to an AWS Managed Elasticsearch domain. 

```typescript
import * as ssp from '@shapirov/cdk-eks-blueprint';

const fluentBitAddOn = new ssp.FluentBitAdddOn({
    elasticsearch: {
        domainArn: domain.domainArn,
        domainEndpoint: domain.domainEndpoint
    }
});
const addOns: Array<ClusterAddOn> = [ fluentBitAddOn ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

