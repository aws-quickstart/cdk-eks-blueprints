# gMaestro add-on for Amazon EKS Blueprints

This repository contains the source code for the gMaestro add-on for [Amazon EKS Blueprints](https://aws-quickstart.github.io/cdk-eks-blueprints/). This add-on is a [CDK](https://aws.amazon.com/cdk/) construct that allows customers to add gMaestro to their Amazon EKS clusters.

gMaestro is a Kubernetes cost optimization solution that helps companies reduce spending on un-utilized resources by up to 60%.

For additional information, visit [gMaestro documentation](https://gmaestro.gitbook.io/gmaestro-docs/).

## Prerequisite 
Before using gMaestro, you need to:
1. [Sign up](https://app.granulate.io/gMaestroSignup) to the gMaestro platform
2. Download a sample YAML file - After signing up to gMaestro, navigate to the [Deploy](https://app.granulate.io/deploy) on the left-hand menu, fill in the required fields and click on "Generate Config File"

![GmaestroGenerateConfigFile](./../assets/images/gmaestro-generate-config-file.png)

![GmaestroConfigFile](./../assets/images/gmaestro-config-file.png)

3. Create a secret (as a plaintext) in AWS Secrets Manager copy its value from the following place:
   1. Navigate to Deployment section in the downloaded config file and use the value of `MAESTRO_CLIENT_ID` environment variable

## Installation

Using [npm](https://npmjs.org):

```bash
$ npm i @granulate/gmaestro-eks-blueprints-addon
```

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import {GmaestroAddOn} from '@granulate/gmaestro-eks-blueprints-addon';

const app = new cdk.App();

const addOn = new GmaestroAddOn({
        clientIdSecretName: "<client id secret name>", // Copy from gMaestro deployment yaml
        clusterName: "<cluster name>", // Copy from gMaestro deployment yaml
    });

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

## AddOn Options

| Option               | Description                                         | Default   |
|----------------------|-----------------------------------------------------|-----------|
| `clientIdSecretName` | The secret name from the Prerequisite section 3.i.  |           |
| `clusterName`        | Navigate to Deployment section in the downloaded config file and use the value of `MAESTRO_SERVICE_NAME` environment variable |           |
| `createNamespace`    | If you want CDK to create the namespace for you     | false     |
| `namespace`          | The namespace where gMaestro will be installed          | "default" |

Use the following command to validate that gMaestro installed successfully:

```bash
$ kubectl get pods --all-namespaces | grep granulate-maestro

NAMESPACE     NAME                                 READY   STATUS    RESTARTS   AGE
default       granulate-maestro-6947dc87bc-k5nfc   2/2     Running   0          11m
```

After a few seconds, you will gain full visibility into your K8s cluster objects.
The first rightsizing recommendations may take up to 5 minutes to load.

## Disclaimer 
This pattern relies on an open source NPM package [aws-eks-blueprint-addon](https://www.npmjs.com/package/@granulate/gmaestro-eks-blueprints-addon?activeTab=readme). Please refer to the package npm site for more information.
```
https://www.npmjs.com/package/@granulate/gmaestro-eks-blueprints-addon?activeTab=readme
```

## Support

If you have questions about Gmaestro, catch us [on Slack](https://join.slack.com/t/granulatecommunity/shared_invite/zt-1dde7x9ki-QHl3pX54peYP91SR5kAcRA)!

## License

The gMaestro add-on is licensed under the Apache 2.0 license.