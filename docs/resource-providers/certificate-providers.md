## Certificate Resource Providers

### ImportCertificateProvider
Imports certificate into the current stack by its ARN

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider("test-cert", new blueprints.ImportCertificateProvider("arn:aws:acm:<region>:<account>:certificate/<cert-id>", "test-cert"))
  ...
  .build()
```

### CreateCertificateProvider
Creates a new certificate for the specified domain and provides it to the stack.  Requires a hosted zone to be registered for validation.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider("internal-zone", new blueprints.ImportHostedZoneProvider('hosted-zone-id', "internal.domain.com"))
  .resourceProvider("test-cert", new blueprints.CreateCertificateProvider("test-cert", "*.internal.domain.com", "internal-zone"))
  ...
  .build()
```
