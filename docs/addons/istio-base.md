# Istio Base Add-on

The Base add-on adds support for Istio base chart which contains cluster-wide resources and CRDs used by the Istio control plane to an EKS cluster.

## Usage

Add the following as an add-on to your main.ts file to add Istio Base to your cluster

```typescript
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();

const addOn = new blueprints.addons.IstioBaseAddOn();

const blueprint = blueprints.EksBlueprint.builder()
  .addOns(addOn)
  .build(app, 'my-stack-name');
```

To validate that installation is successful run the following command:

```bash
$ kubectl get crd -n istio-system
NAME                                         CREATED AT
authorizationpolicies.security.istio.io      2022-05-05T02:16:23Z
destinationrules.networking.istio.io         2022-05-05T02:16:23Z
eniconfigs.crd.k8s.amazonaws.com             2022-05-05T02:04:10Z
envoyfilters.networking.istio.io             2022-05-05T02:16:23Z
gateways.networking.istio.io                 2022-05-05T02:16:23Z
istiooperators.install.istio.io              2022-05-05T02:16:23Z
peerauthentications.security.istio.io        2022-05-05T02:16:23Z
proxyconfigs.networking.istio.io             2022-05-05T02:16:23Z
requestauthentications.security.istio.io     2022-05-05T02:16:23Z
securitygrouppolicies.vpcresources.k8s.aws   2022-05-05T02:04:12Z
serviceentries.networking.istio.io           2022-05-05T02:16:23Z
sidecars.networking.istio.io                 2022-05-05T02:16:23Z
telemetries.telemetry.istio.io               2022-05-05T02:16:23Z
virtualservices.networking.istio.io          2022-05-05T02:16:23Z
wasmplugins.extensions.istio.io              2022-05-05T02:16:23Z
workloadentries.networking.istio.io          2022-05-05T02:16:23Z
workloadgroups.networking.istio.io           2022-05-05T02:16:23Z
```

Note that the all the CRDs are created in provided namespace (istio-system by default).

Once deployed, it allows the control plane to be installed.

## Configuration

 - `enableAnalysis`: Enable istioctl analysis which provides rich analysis of Istio configuration state in order to identity invalid or suboptimal configurations. Defaults to `false` if not specified.
 - `configValidation`: Enable the istio base config validation. Defaults to `true` if not specified.
 - `externalIstiod`: If this is set to true, one Istiod will control remote clusters including CA. Defaults to `false` if not specified.
 - `remotePilotAddress`: The address or hostname of the remote pilot.
 - `validationURL`: Validation webhook configuration url. For example: `https://$remotePilotAddress:15017/validate`.
 - `enableIstioConfigCRDs`: For istioctl usage to disable istio config crds in base. Defaults to `true` if not specified.

## Functionality

1. Installs cluster-wide resources and CRDs used by the Istio control plane
2. Provides convenience options for istioctl commands
3. Works as the basis for the Istio Control Plane AddOn