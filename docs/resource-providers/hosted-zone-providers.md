## Hosted Zone Resource Providers

### LookupHostedZoneProvider
Looks up a hosted zone based on name and optional id and provides it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider("internal-zone-1", new blueprints.LookupHostedZone('internal-zone', "hosted-zone-id"))
  ...
  .build()
```

### ImportHostedZoneProvider
Directly imports a hosted zone based on id and provide it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider("internal-zone-2", new blueprints.ImportHostedZoneProvider('hosted-zone-id', "internal.domain.com"))
  ...
  .build()
```

### DelegatingHostedZoneProvider
Convenient approach to create a global hosted zone record in a centralized account and subdomain records in workload accounts and provide it to the stack.

Example Implementation:
```typescript
const props: blueprints.DelegatingHostedZoneProviderProps = {
  parentDomain: "domain.com", 
  subdomain: "sub.domain.com", 
  parentDnsAccountId: "<account-id>",
  delegatingRoleName: "<IAM-Role-Name>" // must have trust relationship with workload account where blueprint is provisioned
} 
blueprints.EksBlueprint.builder()
  .resourceProvider("internal-zone-3", new blueprints.DelegationHostedZoneProvider(props))
  ...
  .build()
```
