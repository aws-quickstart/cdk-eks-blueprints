# Datadog add-on for AWS SSP

The Datadog SSP add-on deploys the Datadog Agent on Amazon EKS using the [ssp-amazon-eks](https://github.com/aws-quickstart/ssp-amazon-eks) [CDK](https://aws.amazon.com/cdk/) construct.

## Usage

```ts
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { DatadogAddOn } from '@datadog/ssp-addon-datadog';

const app = new cdk.App();

const addOns: Array<ssp.ClusterAddOn> = [
    new DatadogAddOn({
        // Kubernetes secret holding Datadog API key
        // The value should be set with the `api-key` key in the secret object.
        apiKeyExistingSecret: '<secret name>'
    })
];

const account = '<aws account id>'
const region = '<aws region>'
const props = { env: { account, region } }

new ssp.EksBlueprint(app, { id: '<eks cluster name>', addOns}, props)
```

## Add-on Options

| Option                  | Description                                         | Default                       |
|-------------------------|-----------------------------------------------------|-------------------------------|
| `apiKey`                | Your Datadog API key                                | ""                            |
| `appKey`                | Your Datadog APP key                                | ""                            |
| `apiKeyExistingSecret`  | Existing k8s Secret holding the API key             | ""                            |
| `appKeyExistingSecret`  | Existing k8s Secret holding the APP key             | ""                            |
| `namespace`             | Namespace where to install the Datadog Agent    | "default"                     |
| `version`               | Version of the Datadog Helm chart               | "2.28.13"                     |
| `release`               | Name of the Helm release                        | "datadog"                     |
| `repository`            | Repository of the Helm chart                    | "https://helm.datadoghq.com"  |
| `values`                | Configuration values passed to the chart, options are documented [here](https://github.com/DataDog/helm-charts/tree/main/charts/datadog#all-configuration-options) | {}                            |

## Support

https://www.datadoghq.com/support/
