[![New Relic Experimental header](https://github.com/newrelic/opensource-website/raw/master/src/images/categories/Experimental.png)](https://opensource.newrelic.com/oss-category/#new-relic-experimental)

# New Relic AddOn for AWS EKS SSP

This repository contains the source code for the New Relic AddOn for AWS EKS Shared Services Platform (SSP). `ssp-amazon-eks` is a [CDK](https://aws.amazon.com/cdk/) construct that makes it easy for customers to build and deploy New Relic's Kubernetes Integration as part of a Shared Services Platform (SSP) on top of [Amazon EKS](https://aws.amazon.com/eks/).

## Installation

Using [npm](https://npmjs.org):

```bash
$ npm install @newrelic/newrelic-ssp-addon
```

## Usage

```
import { App } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { NewRelicAddOn } from '@newrelic/newrelic-ssp-addon';

const app = new App();

ssp.EksBlueprint.builder()
    .addOns(new ssp.MetricsServerAddOn)
    .addOns(new ssp.ClusterAutoScalerAddOn)
    .addOns(new ssp.addons.SSMAgentAddOn)
    .addOns(new ssp.addons.SecretsStoreAddOn)
    .addOns(new NewRelicAddOn({
        // Uncomment after you create the "newrelic-license-key" secret in
        // AWS Secrets Manager.  Use Plaintext mode.
        // nrLicenseKeySecretName: "newrelic-license-key",
        newRelicClusterName: "demo-cluster"
    }))
    .region(process.env.AWS_REGION)
    .account(process.env.AWS_ACCOUNT)
    .build(app, 'demo-cluster');
```

| Variable                     | Type                   | Required | Description                                                                                                                                                                                                                             |
|------------------------------|------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| newRelicLicenseKey           | string                 | True     | New Relic License Key (plain text).  Use `newRelicLicenseKeySecretName` in tandem with AWS Secrets Manager for added security.                                                                                                          |
| newRelicLicenseKeySecretName | string                 | True     | Secret Name containing the New Relic License Key in AWS Secrets Manager.  Store in `plain text` mode, not `key/value`.                                                                                                                  |
| newRelicClusterName          | string                 | True     |                                                                                                                                                                                                                                         |
| namespace                    | string                 |          | The namespace where New Relic components will be installed. Defaults to  `newrelic`.                                                                                                                                                    |
| lowDataMode                  | boolean                |          | Default  `true`.  Set to  `false`  to disable  `lowDataMode` .  For more details, visit https://docs.newrelic.com/docs/kubernetes-pixie/kubernetes-integration/installation/install-kubernetes-integration-using-helm/#reducedataingest |
| installInfrastructure        | boolean                |          | Default  `true` .  Set to  `false`  to disable installation of the New Relic Infrastructure Daemonset.                                                                                                                                  |
| installKSM                   | boolean                |          | Default  `true` .  Set to  `false`  to disable installation of Kube State Metrics.  An instance of KSM is required in the cluster for the New Relic Infrastructure Daemonset to function properly.                                      |
| installKubeEvents            | boolean                |          | Default  `true` .  Set to  `false`  to disable installation of the New Relic Kubernetes Events integration.                                                                                                                             |
| installLogging               | boolean                |          | Default  `true` .  Set to  `false`  to disable installation of the New Relic Logging (Fluent-Bit) Daemonset.                                                                                                                            |
| installMetricsAdapter        | boolean                |          | Default  `false` .  Set to  `true`  to enable installation of the New Relic Kubernetes Metrics Adapter.                                                                                                                                 |
| installPrometheus            | boolean                |          | Default  `true` .  Set to  `false`  to disable installation of the Prometheus OpenMetrics Integration.                                                                                                                                  |
| version                      | string                 |          | Helm chart version.                                                                                                                                                                                                                     |
| repository                   | string                 |          | Additional options for customers who may need to supply their own private Helm repository.                                                                                                                                              |
| release                      | string                 |          | Additional options for customers who may need to supply their own private Helm repository.                                                                                                                                              |
| chart                        | string                 |          | Additional options for customers who may need to supply their own private Helm repository.                                                                                                                                              |
| values                       | { [key: string]: any } |          | Custom values to pass to the chart. Config options: https://github.com/newrelic/helm-charts/tree/master/charts/nri-bundle#configuration                                                                                                 |

## Support

New Relic hosts and moderates an online forum where customers can interact with New Relic employees as well as other customers to get help and share best practices.

https://discuss.newrelic.com/

## Contributing
We encourage your contributions to improve newrelic-ssp-addon! Keep in mind when you submit your pull request, you'll need to sign the CLA via the click-through using CLA-Assistant. You only have to sign the CLA one time per project.
If you have any questions, or to execute our corporate CLA, required if your contribution is on behalf of a company,  please drop us an email at opensource@newrelic.com.

**A note about vulnerabilities**

As noted in our [security policy](https://github.com/newrelic-experimental/newrelic-ssp-addon/security/policy), New Relic is committed to the privacy and security of our customers and their data. We believe that providing coordinated disclosure by security researchers and engaging with the security community are important means to achieve our security goals.

If you believe you have found a security vulnerability in this project or any of New Relic's products or websites, we welcome and greatly appreciate you reporting it to New Relic through [HackerOne](https://hackerone.com/newrelic).

## License
newrelic-ssp-addon is licensed under the [Apache 2.0](http://apache.org/licenses/LICENSE-2.0.txt) License.
