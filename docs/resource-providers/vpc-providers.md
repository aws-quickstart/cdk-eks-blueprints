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

const app = new cdk.App();

export class VPCStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, 'eks-blueprint-vpc');
  }
}

const vpcStack = new VPCStack(app, 'eks-blueprint-vpc', { env: { account, region } });

blueprints.EksBlueprint.builder()
  .resourceProvider(GlobalResources.Vpc, new blueprints.DirectVpcProvider(vpcStack.vpc))
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

