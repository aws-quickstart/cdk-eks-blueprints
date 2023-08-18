# Relational Database Service Resource Providers

The relational database resource provider specifically tightly couples the lifetime of the RDS
Resources created with that of the EKS Cluster. It should only be used with a so-called management
cluster that governs the platform.

To prevent accidental deletion of data while rebuilding EKS clusters, the default retention policy 
assigned to the RDS instances and clusters is `RetainPolicy.SNAPSHOT` which ensures that while
the cluster and database is being deleted, it is first backed-up and then deleted.

In the management cluster pattern, this resource provider is like resources provisioned with ACK
or Crossplane. Removal of the resource from the management cluster by default will drop such
resources as well.

### CreateRDSInstanceProvider
Creates an RDS Instance and make it available to the blueprint constructs with the provided name.

This method creates an RDS Instance with the database engine of your choice and in the VPC
included in the resource context or creates a VPC for you.

The `rdsProps` transparently exposes the underlying RDS Instance properties and will accept and 
pass them upstream to the RDS instance method creating the database.

Example Implementation without providing a custom VPC:
```typescript
const stack = blueprints.EksBlueprint.builder()
    .resourceProvider(
        GlobalResources.Rds,
        new CreateRDSProvider(
            {
                rdsProps: {
                    credentials: Credentials.fromGeneratedSecret('admin'),
                    engine: DatabaseInstanceEngine.mariaDb({
                        version: MariaDbEngineVersion.VER_10_3
                    })
                },
                name: "rds-instance-no-vpc"
            }
        )
    )
    .account("123456789")
    .region("us-east-1")
    .build(app, 'rds-instance-no-vpc');
```

Example Implementation while providing a custom VPC:
```typescript
const stack = blueprints.EksBlueprint.builder()
    .resourceProvider(
        GlobalResources.Vpc,
        new VpcProvider(
            undefined,
            {
                primaryCidr: "10.0.0.0/16"
            },
        )
    )
    .resourceProvider(
        GlobalResources.Rds,
        new CreateRDSProvider({
            rdsProps: {
                credentials: Credentials.fromGeneratedSecret('admin'),
                engine: DatabaseInstanceEngine.postgres({
                    version: PostgresEngineVersion.VER_15_2
                })
            },
            name: 'rds-instance-w-vpc'
        })
    )
    .account("1234567889")
    .region("us-east-1")
    .build(app, 'rds-instance-w-vpc');

```

### CreateAuroraClusterProvider
Creates an RDS Aurora Cluster and makes it available to the blueprint constructs with the provided name.

This method creates an RDS Cluster with the database engine of your choice and in the VPC
included in the resource context or creates a VPC for you.

The `rdsProps` transparently exposes the underlying RDS Cluster properties and will accept and
pass them upstream to the RDS cluster method creating the database.
We recommend using either Aurora Serverless or creating specific reader and writer instances.

Example Implementation without providing a custom VPC:
```typescript
const stack = blueprints.EksBlueprint.builder()
    .resourceProvider(
        GlobalResources.Rds,
        new CreateAuroraClusterProvider({
            clusterEngine: DatabaseClusterEngine.auroraPostgres(
                { version: AuroraPostgresEngineVersion.VER_14_6 }
            ),
            name: "aurora-cluster-no-vpc"
        })
    )
    .account("123456789")
    .region("us-east-1")
    .build(app, 'aurora-cluster-no-vpc');
```

Example Implementation while providing a custom VPC:
```typescript
const stack = blueprints.EksBlueprint.builder()
    .resourceProvider(
        GlobalResources.Vpc,
        new VpcProvider(
            undefined,
            {
                primaryCidr: "10.0.0.0/16",
            })
    )
    .resourceProvider(
        GlobalResources.Rds,
        new CreateAuroraClusterProvider({
            clusterEngine: DatabaseClusterEngine.auroraPostgres(
                { version: AuroraPostgresEngineVersion.VER_14_6 }
            ),
            name: "aurora-cluster-w-vpc"
        })
    )
    .account("1234567889")
    .region("us-east-1")
    .build(app, 'aurora-cluster-w-vpc');
```