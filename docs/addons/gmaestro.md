# gMaestro add-on for Amazon EKS Blueprints

The gMaestro Blueprints AddOn deploys the gMaestro Agent on Amazon EKS using the [eks-blueprints](https://github.com/aws-quickstart/cdk-eks-blueprints) [CDK](https://aws.amazon.com/cdk/) construct.


## Prerequisite 
Before using gMaestro, you need to:
1. [Sign up](https://app.granulate.io/gMaestroSignup) to the gMaestro platform
2. Download a sample YAML file - After signing up to gMaestro, navigate to the [Deploy](https://app.granulate.io/deploy) on the left-hand menu, fill in the required fields and click on "Generate Config File" 

![GmaestroGenerateConfigFile](images/gmaestro-generate-config-file.png)

![GmaestroConfigFile](images/gmaestro-config-file.png)

3. Create a secret (as a plaintext) in AWS Secrets Manager:
   1. Secret must be defined as plain text (not key/value)
      ```bash
      export MAESTRO_CLIENT_ID="<MAESTRO_CLIENT_ID value from the deployment section in the downloaded config file>"
      export MAESTRO_SECRET_NAME="<MAESTRO_SECRET_NAME your preferred secret name>"
      aws secretsmanager create-secret --name <MAESTRO_SECRET_NAME> \
          --description "Encrypted client ID for Granulate gMaestro" \
          --secret-string "<MAESTRO_CLIENT_ID>"
      ```


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
        clientIdSecretName: "<MAESTRO_SECRET_NAME>", // MAESTRO_SECRET_NAME
        clusterName: "<MAESTRO_SERVICE_NAME>", // Copy from gMaestro deployment yaml
        createNamespace: <true/false>,
        namespace: "<namespace>"
    });

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, '<my-stack-name>');
```

## AddOn Options

| Option               | Description                                                                                                                   | Default   |
|----------------------|-------------------------------------------------------------------------------------------------------------------------------|-----------|
| `clientIdSecretName` | The secret name from the Prerequisite section 3.1. `MAESTRO_CLIENT_ID`                                                        |           |
| `clusterName`        | Navigate to Deployment section in the downloaded config file and use the value of `MAESTRO_SERVICE_NAME` environment variable |           |
| `createNamespace`    | If you want CDK to create the namespace for you                                                                               | false     |
| `namespace`          | The namespace where gMaestro will be installed                                                                                | "default" |


## Support

If you have questions about gMaestro, catch us [on Slack](https://join.slack.com/t/granulatecommunity/shared_invite/zt-1dde7x9ki-QHl3pX54peYP91SR5kAcRA)!
