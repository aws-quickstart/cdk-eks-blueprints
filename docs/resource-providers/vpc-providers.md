## VPC Resourcer Providers

### VpcProvider
If given a VPC id, looks up the corresponding VPC and provides it. Otherwise, creates a new VPC with the optionally provided CIDRs and subnet CIDRs or the default values and makes it available to the blueprint constructs under the provided name.  If the supplied id is default, it will look up the default vpc.

Example Implementations:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider({primaryCidr: "10.0.0.0/16"}))
  ...
  .build();
```

```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider("<vpc-id>"))
  ...
  .build();
```

### DirectVpcProvider
Provides the given VPC to the blueprint constructs under the provided name.

Example Implementation:
```typescript
const myVpc = ec2.Vpc(scope, id + 'vpc');
blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.DirectVpcProvider(myVpc))
  ...
  .build();
```

#### LookupSubnetProvider
Directly imports a secondary subnet provider based on id and makes it available to the blueprint constructs under the provided name.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider('my-subnet', new blueprints.LookupSubnetProvider("subnet-id"))
  ...
  .build();
```

