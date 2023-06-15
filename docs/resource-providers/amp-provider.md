## Amp Resource Provider

### CreateAmpProvider
Creates a new AMP Workspace with the provided AMP Workspace name and tags and provides it to the stack.

Example Implementation:
```typescript
blueprints.EksBlueprint.builder()
  .resourceProvider("amp-workspace", new blueprints.CreateAmpProvider("amp-workspace", "<workspace-name>", [{key:'key', value:'value'}, ...]))
  ...
  .build()
```
