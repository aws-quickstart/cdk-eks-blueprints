## IAM Role Resource Providers

### CreateRoleProvider
Creates a new role based on the given role id, principal, and policies and makes it available to the blueprint constructs under the provided name.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider('service-role', 
    new blueprints.CreateRoleProvider(
      'ServiceRole', 
      new iam.ServicePrincipal('ec2.amazonaws.com'), 
      [iam.ManagedPolicy.fromAwsManagedPolicyName("AWSEC2SpotServiceRolePolicy")])
  )
  ...
  .build();
```

### LookupRoleProvider
Looks up role by name and makes it available to the blueprint constructs under the provided name.  The role will be looked up in the account where the blueprint is deployed, so if a blueprint is deployed in multiple accounts, each account must have the role defined.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider('service-role', new blueprints.LookupRoleProvider("RoleName"))
  ...
  .build();
```
