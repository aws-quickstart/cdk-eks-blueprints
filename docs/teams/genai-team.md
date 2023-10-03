# Generative AI Team

The `GenAITeam` extends the `ApplicationTeam` and allows the Gen AI team to manage the namespace where the generative AI workloads can be deployed. This team **MUST** be used in conjuction with [Gen AI Builder](../builders/genai-builder.md).

The Gen AI Team allows you to create an IRSA to allow pods in namespace specified by the user to access Amazon Bedrock.

## Usage

```typescript
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';

const app = new cdk.App();
      
const genAITeam: blueprints.GenAITeam = {
  namespace: 'bedrock',
  createNamespace: true,
  serviceAccountName: 'bedrock-service-account',
};


const blueprint = blueprints.EksBlueprint.builder()
  .version("auto")
  .teams(new blueprints.GenAITeam(genAITeam))
  .build(app, 'my-stack-name');
```
