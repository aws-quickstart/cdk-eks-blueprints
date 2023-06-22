## Amp Resource Provider

### CreateAmpProvider
Creates a new AMP Workspace with the provided AMP Workspace name and tags and makes it available to the blueprint constructs under the provided name.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider("amp-workspace", new blueprints.CreateAmpProvider("amp-workspace", "<workspace-name>", [{key:'key', value:'value'}, ...]))
  ...
  .build();
```
