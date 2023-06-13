# Amazon CloudWatch Logs Addon using Fluent Bit.

Fluent Bit is an open source Log Processor and Forwarder which allows you to collect any data like metrics and logs from different sources, enrich them with filters and send them to multiple destinations.

AWS provides a Fluent Bit image with plugins for CloudWatch Logs, Kinesis Data Firehose, Kinesis Data Stream and Amazon OpenSearch Service.

This add-on will take care of handling both node and application level logging. THis add-on is configured to stream the worker node logs to CloudWatch Logs. The [AWS for Fluent Bit image](https://gallery.ecr.aws/aws-observability/aws-for-fluent-bit) is available on the Amazon ECR Public Gallery. For more details, see [AWS for Fluent Bit GitHub repository](https://github.com/aws/aws-for-fluent-bit).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.CloudWatchLogsAddon({
	namespace: 'aws-for-fluent-bit',
  createNamespace: true,
	serviceAccountName: 'aws-fluent-bit-for-cw-sa',
  logGroupPrefix: '/aws/eks/<your-cluster-name>',
  logRetentionDays: 90 
});

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## Validation

To validate whether CloudWatch Logs add-on is installed properly, ensure that the required kubernetes resources are running in the cluster.

```bash
kubectl get all -n aws-for-fluent-bit
```

## Output

```
NAME                                                                  READY   STATUS    RESTARTS   AGE
pod/blueprints-addon-aws-fluent-bit-for-cw-aws-for-fluent-bit-46kkk   1/1     Running   0          3m15s
pod/blueprints-addon-aws-fluent-bit-for-cw-aws-for-fluent-bit-6x4xq   1/1     Running   0          3m18s

NAME                                                                       DESIRED   CURRENT   READY   UP-TO-DATE   AVAILABLE   NODE SELECTOR   AGE
daemonset.apps/blueprints-addon-aws-fluent-bit-for-cw-aws-for-fluent-bit   2         2         2       2            2           <none>          3h53m
```

Navigate to Log groups in Amazon CloudWatch console to see log groups starting with `/aws/eks/<your-cluster-name>/workload`.

## Functionality

Applies the CloudWatch Logs add-on to an Amazon EKS cluster. 

## Performance Tuning

By default, we send Fluent Bit application logs and Kubernetes metadata to CloudWatch. If you want to reduce the volume of data being sent to CloudWatch, you can stop one or both of these data sources from being sent to CloudWatch. Please take a look at Amazon CloudWatch documentation on [Reducing the log volume from Fluent Bit](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Container-Insights-setup-logs-FluentBit.html) and please look at the filter section of aws-for-fluent-bit [chart](https://github.com/aws/eks-charts/blob/master/stable/aws-for-fluent-bit/values.yaml) to find ways to apply filters to performance tune your logs that are sent to Cloudwatch.
