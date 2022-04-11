# Extensibility
This guide provides an overview of extensibility options focusing on add-on extensions as the primary mechanism for the partners and customers. 
## Overview
Blueprints Framework is designed to be extensible. In the context of this guide, extensibility refers to the ability of customers and partners to both add new capabilities to the framework or platforms based on Blueprints as well as customize existing behavior, including the ability to modify or override existing behavior.

The following abstractions can be leveraged to add new features to the framework:

- [Add-on](./core-concepts.md#add-on). Customers and partners can implement new add-ons which could be leveraged exactly the same way as the core add-ons (supplied by the framework).
- [Resource Provider](./core-concepts.md#resource-provider). This construct allows customers to create resources that can be reused across multiple add-ons and/or teams. For example, IAM roles, VPC, hosted zone. 
- [Cluster Provider](./cluster-providers/index.md). This construct allows creation of custom code that provisions an EKS cluster with node groups. It can be leveraged to extend behavior such as control plane customization, custom settings for node groups.
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

Implementation of the add-on is expected to be an exported class that implements the interface and supplies the implementation of the `deploy` method. In order for the add-on to receive the deployment contextual information about the provisioned cluster, region, resource providers and/or other add-ons, the `deploy` method takes the `ClusterInfo` parameter (see [types](https://github.com/aws-quickstart/cdk-eks-blueprints/blob/main/lib/spi/types.ts)), which represents a structure defined in the SPI (service provider interface) contracts. The API for the cluster info structure is stable and provides access to the provisioned EKS cluster, scheduled add-ons (that have not been installed yet but are part of the blueprint) or provisioned add-ons and other contexts.

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

### Helm Add-ons

Helm add-ons are the most common case that generally combines provisioning of a helm chart as well as supporting infrastructure such as wiring of proper IAM policies for the Kubernetes service account, provisioning or configuring other AWS resources (VPC, subnets, node groups). 

In order to provide consistency across all Helm add-ons supplied by the Blueprints framework all Helm add-ons are implemented as derivatives of the `HelmAddOn` base class and support properties based on `HelmAddOnUserProps`. See the [example extension section](#example-extension) below for more details.

Use cases that are enabled by leveraging the base `HelmAddOn` class:

1. Consistency across all helm based add-on will reduce effort to understand how to apply and configure standard add-on options.
2. Ability to override helm chart repository can enable leveraging private helm chart repository by the customer and facilitate add-on usage for private EKS clusters.
3. Extensibility mechanisms available in the Blueprints framework can allow to intercept helm deployments and leverage GitOps driven add-on configuration.

### Non-helm Add-ons

Add-ons that don't leverage helm but require to install arbitrary Kubernetes manifests will not be able to leverage the benefits provided by the `HelmAddOn` however, they are still relatively easy to implement.
Deployment of arbitrary kubernetes manifests can leverage the following construct:

```typescript
import { KubernetesManifest } from "aws-cdk-lib/aws-eks";
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

### Add-on Dependencies

Add-ons can depend on other add-ons and that dependency may be soft or hard. Hard dependency implies that add-on provisioning must fail if the dependency is not available. 
For example, if an add-on requires access to AWS Secrets Manager for a secret containing a license key, credentials or other sensitive information, it can declare dependency on the CSI Secret Store Driver. 

Dependency management for direct hard dependency are implemented using a decorator `@dependable`.

Example:

```typescript
import { Construct } from "constructs";
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

## Passing Secrets to Add-ons

Secrets from the AWS Secrets Manager or AWS Systems Manager Parameter Store can be made available as files mounted in Amazon EKS pods. It can be achieved with the help of AWS Secrets and Configuration Provider (ASCP) for the [Kubernetes Secrets Store CSI Driver](https://secrets-store-csi-driver.sigs.k8s.io/). The ASCP works with Amazon Elastic Kubernetes Service (Amazon EKS) 1.17+. More information on general concepts for leveraging ASCP can be found [here](https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_csi_driver.html).

Blueprints Framework provides support for both Secrets Store CSI Driver as well as ASCP with the [Secrets Store Add-on](addons/secrets-store.md).

Add-ons requiring support for secrets can declare dependency on the secret store add-on:

```typescript
export class MyAddOn extends blueprints.addons.HelmAddOn {
...
    // Declares dependency on secret store add-on if secrets are needed. 
    // Customers will have to explicitly add this add-on to the blueprint.
    @blueprints.utils.dependable(blueprints.SecretsStoreAddOn.name) 
    deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {
        ...
    }

```

In order to propagate the secret from the Secrets Manager to the Kubernetes cluster, the add-on should create a `SecretProviderClass` Kubernetes object.  leveraging the `blueprints.addons.SecretProviderClass`. The framework will take care of wiring the Kubernetes service account with the correct IAM permissions to pull the secret:

```typescript

const sa = clusterInfo.cluster.addServiceAccount(...);

const csiSecret: blueprints.addons.CsiSecretProps = {
    secretProvider: new blueprints.LookupSecretsManagerSecretByName(licenseKeySecret), // the secret must be defined upfront and available in the region with the name specified in the licenseKeySecret
    kubernetesSecret: {
        secretName: 'my-addon-license-secret',
        data: [
            {
                key: 'licenseKey'
            }
        ]
    }
};

const secretProviderClass = new blueprints.addons.SecretProviderClass(clusterInfo, sa, "my-addon-license-secret-class", csiSecret);
```
**Note:** you can also leverage `LookupSecretsManagerSecretByArn`, `LookupSsmSecretByAttrs` or a custom implementation of the secret provider interface `blueprints.addons.SecretProvider`. 

After the secret provider class is created, it should be mounted on any pod in the namespace to make the secret accessible. Mounting the secret volume also creates a regular Kubernetes `Secret` object based on the supplied description (`my-addon-license-secret`). This capability is controlled by the configuration of the Blueprints Secret Store add-on and is enabled by default.

Many Helm charts provide options to mount additional volumes and mounts to the provisioned product. For example, a Helm chart (ArgoCD, FluentBit) allows specifying `volumes` and `volumeMounts` as the helm chart values. Mounting the secret in such cases is simple and does not require an additional pod for secrets. 

Here is an example of a secret volume and volume mount passed as values to a Helm chart:

```typescript
const chart = this.addHelmChart(clusterInfo, {
    ... // standard values
    ,
    volumes: [
        {
            name: "secrets-store-inline",
            csi: {
                driver: "secrets-store.csi.k8s.io",
                readOnly: true,
                volumeAttributes: {
                    secretProviderClass: "my-addon-license-secret-class"
        }
            }
        }
    ],
    volumeMounts: [
        {
            name: "secrets-store-inline",
            mountPath: "/mnt/secret-store"
        }
    ]
});
```

After the secret volume is mounted (on any pod), you will see that a Kubernetes secret (for example `my-addon-license-secret`) is also created in the target namespace. See the supplied [code example](#example-extension) for more details.

## Private Extensions

Extensions specific to a customer instance of Blueprints can be implemented inline with the blueprint in the same codebase. Such extensions are scoped to the customer base and cannot be reused. 
Example of a private extension:

```typescript
class MyAddOn extends HelmAddOn {
    
    constructor() {
        super({
            chart: 'mychart',
            ...
        });
    }

    deploy(clusterInfo: blueprints.ClusterInfo): Promise<Construct> {
        return Promise.resolve(this.addHelmChart(clusterInfo, {}));
    }
}

blueprints.EksBlueprint.builder()
    .addOns(new MyAddOn())
    .build(app, 'my-extension-test-blueprint');
```
## Public Extensions

The life-cycle of a public extension should be decoupled from the life-cycle of the [EKS Blueprints main repository](https://github.com/aws-quickstart/cdk-eks-blueprints). When decoupled, extensions can be released at any arbitrary cadence specific to the extension, enabling better agility when it comes to new features or bug fixes. 

In order to enable this model the following workflow outline steps required to create and release a public extension:

1. Public extensions are created in a separate repository. Public GitHub repository is preferred as it aligns with the open-source spirit of the framework and enables external reviews/feedback.
2. Extensions are released and consumed as distinct public NPM packages. 
3. Public Extensions are expected to have sufficient documentation to allow customers to consume them independently. Documentation can reside in GitHub or external resources referenced in the documentation bundled with the extension.
4. Public extensions are expected to be tested and validated against released Blueprints versions, e.g. with a CICD pipeline. Pipeline can be created with the [pipelines](./pipelines.md) support from the Blueprints framework or leveraging customer/partner specific tools. 

## Partner Extensions

Partner extensions (APN Partner) are expected to comply with the public extension workflow and additional items required to ensure proper validation and documentation support for a partner extension. 

1. Documentation PR should be created to the main [Blueprints Quickstart repository](https://github.com/aws-quickstart/cdk-eks-blueprints) to update the AddOns section. Example of add-on documentation can be found [here](https://aws-quickstart.github.io/cdk-eks-blueprints/addons/container-insights/) along with the list of other add-ons.
2. An example that shows a ready to use pattern leveraging the add-on should be submitted to the [Blueprints Patterns Repository](https://github.com/aws-samples/cdk-eks-blueprints-patterns). This step will enable AWS PSAs to validate the add-on as well as provide a ready to use pattern to the customers, that could be copied/cloned in their Blueprints implementation. 

## Example Extension

[Example extension](https://github.com/shapirov103/eks-blueprints-extension) contains a sample implementation of a FluentBit log forwarder add-on and covers the following aspects of an extension workflow:

1. Pre-requisite configuration related to nodejs, npm, typescript.
2. Project template with support to build, test and run the extension.
3. Example blueprint (can be found in ./bin/main.ts) that references the add-on.
4. Example of configuring a Kubernetes service account with IRSA (IAM roles for service accounts) and required IAM policies. 
5. Example of the helm chart provisioning. 
6. Example of passing secret values to the add-on (such as credentials and/or licenseKeys) by leveraging CSI Secret Store Driver.
7. Outlines support to build, package and publish the add-on in an NPM repository. 



