## VPC Resourcer Providers

### VpcProvider
If given a VPC id, looks up the corresponding vpc and provides it. Otherwise, creates a VPC with the optionally provided CIDRs and subnet CIDRs or the default values and provides it to the stack.

Example Implementations:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider({primaryCidr: "10.0.0.0/16"}))
  ...
  .build()
```

```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.VpcProvider("<vpc-id>"))
  ...
  .build()
```

### DirectVpcProvider
Provides the given VPC as a stack resource.

Example Implementation:
```typescript
const myVpc = ec2.Vpc(scope, id + 'vpc')
blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.DirectVpcProvider(myVpc))
  ...
  .build()
```

#### LookupSubnetProvider
Directly imports a secondary subnet provider based on id and provides it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider('my-subnet', new blueprints.LookupSubnetProvider("subnet-id"))
  ...
  .build()
```

