# AWS for Fluent Bit

Fluent Bit is an open source log processor and forwarder which allows you to collect data like metrics and logs from different sources, enrich them with filters and send them to multiple destinations.

AWS provides a Fluent Bit image with plugins for both CloudWatch Logs and Kinesis Data Firehose. The [AWS for Fluent Bit image](https://gallery.ecr.aws/aws-observability/aws-for-fluent-bit) is available on the Amazon ECR Public Gallery. For more details, see [AWS for Fluent Bit GitHub repository](https://github.com/aws/aws-for-fluent-bit).

## Usage

```typescript
import * as blueprints from '@aws-quickstart/cdk-eks-blueprints';

const awsForFluentBit = new blueprints.addons.AwsForFluentBitAddOn();
const addOns: Array<ClusterAddOn> = [ awsForFluentBit ];

const app = new cdk.App();
new EksBlueprint(app, 'my-stack-name', addOns, [], {
  env: {
      account: <AWS_ACCOUNT_ID>,
      region: <AWS_REGION>,
  },
});
```

## Configuration 

AWS for FluentBit can be configured to forward logs to multiple AWS destinations including CloudWatch, Kinesis, and Elasticsearch (now AWS OpenSearch Search). 

Sample configuration can be found below:

```typescript
import * as blueprints from '@aws-quickstart/cdk-eks-blueprints';

const awsForFluentBit = new blueprints.addons.AwsForFluentBitAddOn({ 
	values: {
		cloudWatch: {
			enabled: true,
			region: "<aws_region",
			logGroupName: "<log_groups_name>"
		},
		kinesis: {
			enabled: true,
			region: "<aws_region",
			deliveryStream: "<delivery_stream>"
		},
		elasticSearch: {
			enabled: true,
			region: "<aws_region",
			host: "<elastic_search_host>"
		}
	}
});
```

## IAM Policies 

When leveraging AWS for FluentBit to forward logs to various AWS destinations, you will need to supply an IAM role that grants privileges to the namespace in which FluentBit runs. For example, in order to forward logs to Amazon Elasticsearch Service, you would supply the following IAMPolicyStatement. 

```typescript
import * as blueprints from '@aws-quickstart/cdk-eks-blueprints';

const domain = es.Domain()
const domainWritePolicy = new iam.PolicyStatement({
	actions: [
		'es:ESHttpDelete',
		'es:ESHttpPost',
		'es:ESHttpPut',
		'es:ESHttpPatch'
	],
	resources: [domain.arn],
})

const awsForFluentBit = new blueprints.addons.AwsForFluentBitAddOn({ 
	iamPolicies: [domainWritePolicy]
	values: {
		elasticSearch: {
			enabled: true,
			region: "<aws_region",
			host: "<elastic_search_host>"
		}
	}
});
```
