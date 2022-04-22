# Datadog Amazon EKS Blueprints AddOn

The Datadog Blueprints AddOn deploys the Datadog Agent on Amazon EKS using the [eks-blueprints](https://github.com/aws-quickstart/cdk-eks-blueprints) [CDK](https://aws.amazon.com/cdk/) construct.

## Installation

```
npm install @datadog/datadog-eks-blueprints-addon
```

## Usage

### Using an existing Kubernetes secret

```js
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { DatadogAddOn } from '@datadog/datadog-eks-blueprints-addon';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
    new DatadogAddOn({
        // Kubernetes secret holding Datadog API key
        // The value should be set with the `api-key` key in the secret object.
        apiKeyExistingSecret: '<secret name>'
    })
];

const account = '<aws account id>'
const region = '<aws region>'
const props = { env: { account, region } }

new blueprints.EksBlueprint(app, { id: '<eks cluster name>', addOns}, props)
```

### Using AWS Secrets Manager

Store the API key using AWS Secrets Manager:

```
aws secretsmanager create-secret --name <secret name> --secret-string <api_key> --region <aws region>
```

Refer to the previously created secret with `apiKeyAWSSecret`:

```js
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { DatadogAddOn } from '@datadog/datadog-eks-blueprints-addon';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
    new DatadogAddOn({
        apiKeyAWSSecret: '<secret name>'
    })
];

const account = '<aws account id>'
const region = '<aws region>'
const props = { env: { account, region } }

new blueprints.EksBlueprint(app, { id: '<eks cluster name>', addOns}, props)
```

## AddOn Options

| Option                  | Description                                         | Default                       |
|-------------------------|-----------------------------------------------------|-------------------------------|
| `apiKey`                | Your Datadog API key                                | ""                            |
| `appKey`                | Your Datadog APP key                                | ""                            |
| `apiKeyExistingSecret`  | Existing k8s Secret storing the API key             | ""                            |
| `appKeyExistingSecret`  | Existing k8s Secret storing the APP key             | ""                            |
| `apiKeyAWSSecret`       | Secret in AWS Secrets Manager storing the API key    | ""                            |
| `appKeyAWSSecret`       | Secret in AWS Secrets Manager storing the APP key    | ""                            |
| `namespace`             | Namespace to install the Datadog Agent    | "default"                     |
| `version`               | Version of the Datadog Helm chart               | "2.28.13"                     |
| `release`               | Name of the Helm release                        | "datadog"                     |
| `repository`            | Repository of the Helm chart                    | "https://helm.datadoghq.com"  |
| `values`                | Configuration values passed to the chart. [See options](https://github.com/DataDog/helm-charts/tree/main/charts/datadog#all-configuration-options). | {}                            |

## Support

https://www.datadoghq.com/support/
