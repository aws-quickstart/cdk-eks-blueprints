# Extensibility
This guide provides an overview of extensibility options focusing on add-on extensions as the primary mechanism for the partners and customers. 
## Overview
SSP Framework is designed to be extensible. In the context of this guide, extensibility refers to the ability of customers and partners to both add new capabilities to the framework or platforms based on SSP as well as customize existing behavior, including ability to modify or override existing behavior.

The following abstractions can be leveraged to add new features to the framework:

- [Add-on](./core-concepts.md#add-on). Customers and partners can implement new add-ons which could be leveraged exactly the same way as the core add-ons (supplied by the framework).
- [Resource Provider](./core-concepts.md#resource-provider). This construct allows to create resources that can be reused across multiple add-ons and/or teams. For example, IAM roles, VPC, hosted zone. 
- [Cluster Provider](./cluster-providers/index.md). This construct allows creation of custom code that provisions EKS cluster with node groups. It can be leveraged to extend behavior such as control plane customization, custom settings for node groups.
- [Team](./teams.md). This abstraction allows to create team templates for application and platform teams and set custom setting for network isolation, policies (network, security), software wiring (auto injection of proxies, team specific service mesh configuration) and other extensions pertinent to the teams. 

## Add-on Extensions

In a general case, implementation of an add-on is a class which implements the `ClusterAddOn` interface.

```typescript
export declare interface ClusterAddOn { 
    id? : string;
    deploy(clusterInfo: types.ClusterInfo): Promise<Construct> | void;
}
```

**Note**: The add-on implementation can optionally supply the `id` attribute if the target add-on can be added to a blueprint more than once. 

Implementation of the add-on is expected to be an exported class that implements the interface and supplies the implementation of the `deploy` method. In order for the add-on to receive the deployment contextual information about the provisioned cluster, region, resource providers and/or other add-ons, the `deploy` method takes the `ClusterInfo` parameter, which represents a structure defined in the SPI (service provider interface) contracts. The API for the cluster info structure is stable and provides access to the provisioned EKS cluster, scheduled add-ons (that have not been installed yet but are part of the blueprint) or provisioned add-ons and other contexts.

### Post Deployment Hooks

In certain cases, add-on provisioning may require logic to be executed after provisioning of the add-ons (and teams) is complete. For such cases, add-on can optionally implement `ClusterPostDeploy` interface.

```typescript
/**
 * Optional interface to allow cluster bootstrapping after provisioning of add-ons and teams is complete.
 * Can be leveraged to bootstrap workloads, perform cluster checks. 
 * ClusterAddOn implementation may implement this interface in order to get post deployment hook point.
 */
export declare interface ClusterPostDeploy {
    postDeploy(clusterInfo: types.ClusterInfo, teams: Team[]): void;
}
```

This capability is leveraged for example in ArgoCD add-on to bootstrap workloads after all add-ons finished provisioning. Note, in this case unlike the standard `deploy` method implementation, the add-on also gets access to the provisioned teams. 

### Add-on Dependencies

Add-ons can depend on other add-ons and that dependency may be soft or hard. Hard dependency implies that add-on provisioning must fail if the dependency is not available. 
For example, if an add-on requires access to AWS Secrets Manager for a secret containing a license key, credentials or other sensitive information, it can declare dependency on the CSI Secret Store Driver. 

Dependency management for direct hard dependency are implemented using a decorator `@dependable`.

Example:

```typescript
import { Construct } from "@aws-cdk/core";
import { ClusterInfo } from "../../spi";
import { dependable } from "../../utils";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";

export class MyProductAddOn extends HelmAddOn {

    readonly options: MyProductAddOnProps; // extends HelmAddOnUserProps
   
    ...
 
    @dependable('AwsLoadBalancerControllerAddOn') // depends on AwsLoadBalancerController
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        ...
    }
```
### Helm Add-ons

Helm add-ons are the most common case that generally combines provisioning of a helm chart as well as supporting infrastructure such as wiring of proper IAM policies for the Kubernetes service account, provisioning or configuring other AWS resources (VPC, subnets, node groups). 

In order to provide consistency across all Helm add-ons supplied by the SSP framework all Helm add-ons are implemented as derivatives of the `HelmAddOn` base class and support properties based on `HelmAddOnUserProps`. See the [example extension section](#example-extension) below for more details.

Use cases that are enabled by leveraging the base `HelmAddOn` class:

1. Consistency across all helm based add-on will reduce effort to understand how to apply and configure standard add-on options.
2. Ability to override helm chart repository can enable leveraging private helm chart repository by the customer and facilitate add-on usage for private EKS clusters.
3. Extensibility mechanisms available in the SSP framework can allow to intercept helm deployments and leverage GitOps driven add-on configuration.

### Non-helm Add-ons

Add-ons that don't leverage helm but require to install arbitrary Kubernetes manifests will not be able to leverage the benefits provided by the `HelmAddOn` however, they are still relatively easy to implement.
Deployment of arbitrary kubernetes manifests can leverage the following construct:

```typescript
import { KubernetesManifest } from "@aws-cdk/aws-eks";
import { ClusterAddOn, ClusterInfo } from "../../spi";
import { loadYaml, readYamlDocument } from "../../utils/yaml-utils";

export class MyNonHelmAddOn implements ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void {
        const cluster = clusterInfo.cluster;
        // Apply manifest
        const doc = readYamlDocument(__dirname + '/my-product.yaml');
        // ... apply any substitutions for dynamic values 
        const manifest = docArray.split("---").map(e => loadYaml(e));
        new KubernetesManifest(cluster.stack, "myproduct-manifest", {
            cluster,
            manifest,
            overwrite: true
        });
    }
}
```
**Note:** When leveraging this approach consider how customers can apply the add-on for fully private clusters. It may be reasonable to bundle the manifest with the add-on in the npm package. 

## Example Extension

[Example extension](https://github.com/shapirov103/ssp-eks-extension) contains a sample implementation of a FluentBit log forwarder add-on and covers the following aspects of an extension workflow:

1. Pre-requisite configuration related to nodejs, npm, typescript.
2. Project template with support to build, test and run the extension.
3. Example blueprint (can be found in ./bin/main.ts) that references the add-on.
4. Example of configuring a Kubernetes service account with IRSA (IAM roles for service accounts) and required IAM policies. 
5. Example of the helm chart provisioning. 
6. Outlines support to build, package and publish the add-on in an NPM repository. 



