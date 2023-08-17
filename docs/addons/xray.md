# AWS X-Ray Add-on

This add-on is currently deprecated since the underlying manifests are incompatible with the latest versions of EKS. Please use [XRay Adot Add-on](xray-adot-addon.md).

[AWS X-Ray](https://aws.amazon.com/xray/) helps developers analyze and debug production, distributed applications, such as those built using a microservices architecture. The X-Ray addon provisions X-Ray daemon into an EKS cluster. This daemon exposes receives X-Ray SDK metrics and pushes the traces to X-Ray console. 

For instructions on getting started with X-Ray on EKS refer to the [X-Ray Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy_servicelens_CloudWatch_agent_deploy_EKS.html).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.XrayAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Once deployed, it allows applications to be instrumented with X-Ray by leveraging the X-Ray SDK.  Examples of such integration can be found on [AWS Docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy_servicelens_CloudWatch_agent_deploy_EKS.html).

## Functionality

1. Creates the `amazon-cloudwatch` namespace.
2. Deploys the [`xray-daemon`](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/deploy_servicelens_CloudWatch_agent_deploy_EKS.html) manifests into the cluster.
3. Configures Node role with policies (`AWSXRayDaemonWriteAccess`) for communication between the cluster and the X-Ray service.

