## IAM Role Resource Providers

### CreateRoleProvider
Creates a new role based on the given role id, principal, and policies and provides it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider('service-role', 
    new blueprints.CreateRoleProvider(
      'ServiceRole', 
      new iam.ServicePrincipal('ec2.amazonaws.com'), 
      [iam.ManagedPolicy.fromAwsManagedPolicyName("AWSEC2SpotServiceRolePolicy")])).
  ...
  .build()
```

### LookupRoleProvider
Looks up role by name and provides it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider('service-role', new blueprints.LookupRoleProvider("RoleName"))
  ...
  .build()
```
