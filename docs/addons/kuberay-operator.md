# KubeRay Operator Add-on

[Ray](https://github.com/ray-project/ray) is a framework for scaling AI applications written in Python. Ray consists of a core distributed runtime and a set of AI libraries for simplifying ML compute. Ray allows scaling applications from a laptop to a cluster.

KubeRay is a Kubernetes Operator that simplifies the deployment and management of Ray applications on Kubernetes. It is made of the following components:

- KubeRay core, the official, fully-maintained component of KubeRay that provides three custom resource definitions, RayCluster, RayJob, and RayService
- Community-managed components (optional): KubeRay APIServer, KubeRay Python client and KubeRay CLI

Please refer to [KubeRay Operator documentation](https://docs.ray.io/en/latest/cluster/kubernetes/index.html) for detailed information.

This add-on installs the KubeRay Operator [Helm chart](https://github.com/ray-project/kuberay/blob/master/helm-chart/kuberay-operator/README.md).

## Usage

```typescript
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';

export class DatadogConstruct extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);
        
        const stackID = `${id}-blueprint`;

        const addOn = new blueprints.addons.KubeRayAddOn();

        blueprints.EksBlueprint.builder()
            .account(process.env.CDK_DEFAULT_ACCOUNT!)
            .region(process.env.CDK_DEFAULT_REGION!)
            .version('auto')
            .addOns(addOn)
            .build(scope, stackID);
    }
}
```

## Validation

To validate the KubeRay Operator installation, please run the following command:

```bash
kubectl get pods 
```

Expected output:

```bash
NAME                                READY   STATUS    RESTARTS   AGE
kuberay-operator-58c98b495b-5k75l   1/1     Running   0          112m
```
