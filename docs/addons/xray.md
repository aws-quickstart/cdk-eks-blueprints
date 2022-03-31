# AWS X-Ray Add-on

[AWS X-Ray](https://aws.amazon.com/xray/) helps developers analyze and debug production, distributed applications, such as those built using a microservices architecture. The X-Ray addon provisions X-Ray daemon into an EKS cluster. This daemon exposes an internal endpoint `xray-service.xray-system.svc.cluster.local:2000` that could be leveraged to aggregate and post traces to the AWS X-Ray service. 

For instructions on getting started with X-Ray on EKS refer to the [EKS Workshop X-Ray Section](https://www.eksworkshop.com/intermediate/245_x-ray/).

## Usage

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.XrayAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

Once deployed, it allows applications to be instrumented with X-Ray by leveraging the X-Ray SDK.  Examples of such integration can be found on [GitHub](https://github.com/aws-samples/aws-xray-kubernetes).

## Functionality

1. Creates the `xray-system` namespace.
2. Deploys the [`xray-daemon`](https://www.eksworkshop.com/intermediate/245_x-ray/x-ray-daemon/) manifests into the cluster.
3. Configures Kubernetes service account with IRSA (`AWSXRayDaemonWriteAccess`) for communication between the cluster and the AWS X-Ray service 

