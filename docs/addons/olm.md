# Operator Lifecycle Manager Amazon EKS Blueprints AddOn

This add-on installs [Operator Lifecycle Manager](https://olm.operatorframework.io/) (OLM).

## Setup

OLM defines Custom Resource Definitions (CRDs). Operators relying on those CRDs should be deployed once the CRDs are defined, to avoid deployment errors from Kubernetes. To avoid such errors, you can create a KubernetesObjectValue and add a dependency on that. For a working example, please see the Konveyor add-on.