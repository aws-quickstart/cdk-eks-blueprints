# Bedrock Builder

The `BedrockBuilder` allows you to get started with a builder class to configure required addons as you prepare a blueprint for setting up EKS cluster with access to Bedrock.

The `BedrockBuilder` creates the following:

- An EKS Cluster` with passed k8s version and cluster tags.
- A nodegroup to schedule Gen AI workloads with parameters passed.
- Sets up IRSA with access to Bedrock service.

### Bedrock on EKS Cluster

The below usage helps you with a demonstration to use `BedrockBuilder` to setup required addons as you prepare a blueprint for setting up Bedrock access to a new EKS cluster.

```typescript
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { BedrockBuilder } from '@aws-quickstart/eks-blueprints';

export default class GenAIShowcase {
    constructor(scope: Construct, id: string) {
        const stackId = `${id}-genai-accelerator`;

        const account = process.env.COA_ACCOUNT_ID! || process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.COA_AWS_REGION! || process.env.CDK_DEFAULT_REGION!;
        const bedrockTeam: blueprints.BedrockTeam = {
            namespace: 'bedrock',
            createNamespace: true,
            serviceAccountName: 'bedrock-service-account',
        };  

        BedrockBuilder.builder()
            .account(account)
            .region(region)
            .teams(new blueprints.GenAITeam(bedrockTeam))
            .build(scope, stackId);
    }
}
```