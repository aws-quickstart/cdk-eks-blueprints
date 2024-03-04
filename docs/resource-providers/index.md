# Resource Providers

## Terminology

**Resource**
A resource is a CDK construct that implements `IResource` interface from `aws-cdk-lib` which is a generic interface for any AWS resource. An example of a resource could be a hosted zone in Route53 [`IHostedZone`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.HostedZone.html), an ACM certificate [`ICertificate`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_certificatemanager.ICertificate.html), a VPC or even a DynamoDB table which could be leveraged either in add-ons or teams.

**ResourceProvider**
A resource provider is a core Blueprints concept that enables customers to supply resources for add-ons, teams and/or post-deployment steps. Resources may be imported (e.g., if created outside of the platform) or created with the blueprint.

## Use Cases

`ClusterAddOn` and `Team` implementations require AWS resources that can be shared across several constructs. For example, `ExternalDnsAddOn` requires an array of hosted zones that will be used for integration with Route53. `NginxAddOn` requires a certificate and hosted zone (for DNS validation) in order to use TLS termination. VPC may be used inside add-ons and team constructs to look up VPC CIDR and subnets.

The Blueprints framework provides ability to register a resource provider under an arbitrary name and make it available in the resource context, which is available to all add-ons and teams. With this capability, customers can either use existing resource providers or create their own and reference the provided resources inside add-ons, teams or other resource providers.

Resource providers may depend on resources provided by other resource providers. For example, `CertificateResourceProvider` relies on a hosted zone resource, which is expected to be supplied by another provider.

Example use cases:

1. As a platform user, I must create a VPC using my enterprise standards and leverage it for the EKS Blueprint. Solution: create an implementation of `ResourceProvider<IVpc>` (or leverage an existing one) and register it with the blueprint (see Usage).

2. As a platform user, I need to use an existing hosted zone for all external DNS names used with ingress objects of my workloads. Solution: use a predefined `ImportHostedZoneProvider` or `LookupHostedZoneProvider` to reference the existing hosted zone.

3. As a platform user, I need to create an S3 bucket and use it in one or more `Team` implementations. Solution: create an implementation for an S3 Bucket resource provider and use the supplied resource inside teams.

## Contracts

The API contract for a resource provider is represented by the `ResourceProvider` interface from the `spi/resource-contracts` module.

```typescript
export declare interface ResourceProvider<T extends IResource = IResource> {
    provide(context: ResourceContext): T;
}
```

Example implementations:

```typescript
class VpcResourceProvider implements ResourceProvider<IVpc> {
    provide(context: ResourceContext): IVpc {
        const scope = context.scope; // stack
        ...
    }
}

class DynamoDbTableResourceProvider implements ResourceProvider<ITable> {
    provide(context: ResourceContext): ITable {
        ...
    }
}

/**
 * Example implementation of a VPC Provider that creates a NAT Gateway 
 * which is available in all 3 AZs of the VPC while only being in one
 */
class OtherVpcResourceProvider implements ResourceProvider<IVpc> {
    provide(context: ResourceContext): IVpc {
        return new Vpc(context.scope, '<vpc-name>', {
            availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'], // VPC spans all AZs
            subnetConfiguration: [{
                cidrMask: 24,
                name: 'private',
                subnetType: SubnetType.PRIVATE_WITH_EGRESS
            }, {
                cidrMask: 24,
                name: 'public',
                subnetType: SubnetType.PUBLIC
            }],
            natGatewaySubnets: {
                availabilityZones: ['us-east-1b'] // NAT gateway only in 1 AZ 
                subnetType: SubnetType.PUBLIC
            }
        });
    }
}

```

Access to registered resources from other resource providers and/or add-ons and teams:

```typescript
/**
 * Provides API to register resource providers and get access to the provided resources.
 */
export class ResourceContext {
    
    /**
     * Adds a new resource provider and specifies the name under which the provided resource will be registered,
     * @param name Specifies the name key under which the provided resources will be registered for subsequent look-ups.
     * @param provider Implementation of the resource provider interface
     * @returns the provided resource
     */
    public add<T extends cdk.IResource = cdk.IResource>(name: string, provider: ResourceProvider<T>) : T {
        ...
    }

    /**
     * Gets the provided resource by the supplied name. 
     * @param name under which the resource provider was registered
     * @returns the resource or undefined if the specified resource was not found
     */
    public get<T extends cdk.IResource = cdk.IResource>(name: string) : T | undefined {
        ...
    }
}
```

Convenience API to access registered resources from add-ons:

```typescript
/**
 * Cluster info supplies all contextual information on the cluster configuration, registered resources and add-ons 
 * which could be leveraged by the framework, add-on implementations and teams.
 */
export class ClusterInfo {
    ...

    /**
     * Provides the resource context object associated with this instance of the EKS Blueprint.
     * @returns resource context object
     */
    public getResourceContext(): ResourceContext {
        return this.resourceContext;
    }

    /**
     * Provides the resource registered under supplied name
     * @param name of the resource to be returned
     * @returns Resource object or undefined if no resource was found
     */
    public getResource<T extends cdk.IResource>(name: string): T | undefined {
        ...
    }

    /**
     * Same as {@link getResource} but will fail if the specified resource is not found
     * @param name of the resource to be returned
     * @returns Resource object (fails if not found)
     */
    public getRequiredResource<T extends cdk.IResource>(name: string): T {
        ...
    }
}
```

## Usage

**Registering Resource Providers for a Blueprint**

Note: `GlobalResources.HostedZone` and `GlobalResources.Certificate` are provided for convenience as commonly referenced constants.
Full list of Resource Providers can be found [here](https://aws-quickstart.github.io/cdk-eks-blueprints/api/modules/resources.html).

```typescript
const myVpcId = ...;  // e.g. app.node.tryGetContext('my-vpc', 'default)  will look up property my-vpc in the cdk.json

blueprints.EksBlueprint.builder()
    //  Specify VPC for the cluster (if not set, a new VPC will be provisioned as per EKS Best Practices)
    .resourceProvider(GlobalResources.VPC, new VpcProvider(myVpcId))
    //  Specify KMS Key as cluster secrets encryption key
    .resourceProvider(GlobalResources.KmsKey, new CreateKmsKeyProvider('my-alias-name'))    
    //  Register hosted zone and give it a name of GlobalResources.HostedZone
    .resourceProvider(GlobalResources.HostedZone, new ImportHostedZoneProvider('hosted-zone-id1', 'my.domain.com'))
    .resourceProvider("internal-hosted-zone", new ImportHostedZoneProvider('hosted-zone-id2', 'myinternal.domain.com'))
    // Register certificate GlobalResources.Certificate name and reference the hosted zone registered in the previous step
    .resourceProvider(GlobalResources.Certificate, new CreateCertificateProvider('domain-wildcard-cert', '*.my.domain.com', GlobalResources.HostedZone))
    .resourceProvider("private-ca", new CreateCertificateProvider('internal-wildcard-cert', '*.myinternal.domain.com', "internal-hosted-zone"))
    // Create EFS file system and register it under the name of efs-file-system
    .resourceProvider("efs-file-system", new CreateEfsFileSystemProvider('efs-file-system'))
    // Create an S3 bucket and register it
    .resourceProvider('blueprint-s3', new blueprints.CreateS3BucketProvider({
        name: `bucket-name`, // This bucket name must be globally unique 
        id: 'blueprints-s3-bucket-id',
        s3BucketProps: { removalPolicy: cdk.RemovalPolicy.DESTROY }
    }))
    .addOns(new AwsLoadBalancerControllerAddOn())
    // Use hosted zone for External DNS
    .addOns(new ExternalDnsAddOn({hostedZoneResources: [GlobalResources.HostedZone]}))
    // Use certificate registered before with NginxAddon
    .addOns(new NginxAddOn({
        certificateResourceName: GlobalResources.Certificate,
        externalDnsHostname: 'my.domain.com'
    }))
    .teams(...)
    .version("auto")
    .build(app, 'stack-with-resource-providers');
```

**Registering Multiple Hosted Zones**

```typescript
blueprints.EksBlueprint.builder()
    //  Register hosted zone1 under the name of MyHostedZone1
    .resourceProvider("MyHostedZone1", new ImportHostedZoneProvider('hosted-zone-id1', 'my.domain.com'))
    // Register zone2 under the name of MyHostedZone2
    .resourceProvider("MyHostedZone2", new ImportHostedZoneProvider('hosted-zone-id2', 'my.otherdomain.com'))
    // Register certificate and reference the hosted zone1 registered in the previous steps
    .resourceProvider("MyCert", new CreateCertificateProvider('domain-wildcard-cert', '*.my.domain.com', "MyHostedZone1"))
    .addOns(new AwsLoadBalancerControllerAddOn())
    // Use hosted zones for External DNS
    .addOns(new ExternalDnsAddOn({hostedZoneResources: ["MyHostedZone1", "MyHostedZone2"]}))
    // Use certificate registered before with NginxAddon
    .addOns(new NginxAddOn({
        certificateResourceName: "MyCert",
        externalDnsHostname: 'my.domain.com'
    }))
    .teams(...)
    .version("auto")
    .build(app, 'stack-with-resource-providers');
```

## Using Resource Providers with CDK Constructs

Some constructs used in the `EKSBlueprint` stack are standard CDK constructs that accept CDK resources.

For example, `GenericClusterProvider` (which is the basis for all cluster providers) allows passing resources like `IRole`, `SecurityGroup` and other properties that customers may find inconvenient to define with a builder pattern.

Blueprints provide a convenience API to register such resources in a declarative manner.

Example with an anonymous resource:

```typescript
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_25,
    mastersRole: blueprints.getResource(context => { // will generate a unique name for resource. designed for cases when resource is defined once and needed in a single place.
        return new iam.Role(context.scope, 'AdminRole', { assumedBy: new AccountRootPrincipal() });
    }),
    managedNodeGroups: [
        ...
    ]
});

blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .clusterProvider(clusterProvider)
    .version("auto")
    .build(scope, blueprintID, props);
```

Example with a named resource:

```typescript
const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_25,
    mastersRole: blueprints.getNamedResource("my-role") as iam.Role,
    managedNodeGroups: [
        ...
    ]
});

blueprints.EksBlueprint.builder()
    .resourceProvider("my-role", new blueprints.LookupRoleProvider("SomeExistingRole")) // enables to look up this role from ClusterInfo under "my-role" in add-ons, etc.
    .addOns(...addOns)
    .clusterProvider(clusterProvider)
    .version("auto")
    .build(scope, blueprintID, props);
```

## Implementing Custom Resource Providers

1. Select the type of the resource that you need. Let's say it will be an FSx File System. Note: it must be one of the derivatives/implementations of `IResource` interface.
2. Implement [`ResourceProvider`](https://aws-quickstart.github.io/cdk-eks-blueprints/api/interfaces/ResourceProvider.html) interface:

```typescript
class MyResourceProvider implements blueprints.ResourceProvider<fsx.IFileSystem> {
    provide(context: blueprints.ResourceContext): s3.IBucket {
        return new fsx.LustreFileSystem(context.scope, "FsxLustreFileSystem");
    }
}
```

3. Register your resource provider under an arbitrary name which must be unique in the current scope across all resource providers:

```typescript
blueprints.EksBlueprint.builder()
    .resourceProvider("FsxLustreFileSystem" ,new MyResourceProvider())
    .addOns(...)
    .teams(...)
    .version("auto")
    .build();
```

4. Use the resource inside a custom add-on:

```typescript
class MyCustomAddOn implements blueprints.ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): void | Promise<cdk.Construct> {
        const myFsxfileSystem: fsx.LustreFileSystem = clusterInfo.getRequiredResource('FsxLustreFileSystem'); // will fail if the file system does not exist
        // do something with the file system
    }
}

```
