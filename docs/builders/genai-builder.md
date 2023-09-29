# Generative AI Builder

The `GenAIBuilder` allows you to get started with a builder class to configure required addons as you prepare a blueprint for setting up Generative AI EKS cluster.

The `GenAIBuilder` creates the following:

- An EKS Cluster` with passed k8s version and cluster tags.
- A nodegroup to schedule Gen AI workloads with parameters passed.

### Generative AI on EKS Cluster

The below usage helps you with a demonstration to use `GenAIBuilder` to setup required addons as you prepare a blueprint for setting up Generative AI on a new EKS cluster.

```typescript
import { Construct } from 'constructs';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import { ObservabilityBuilder } from '@aws-quickstart/eks-blueprints';

export default class GenAIShowcase {
    constructor(scope: Construct, id: string) {
        const stackId = `${id}-genai-accelerator`;

        const account = process.env.COA_ACCOUNT_ID! || process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.COA_AWS_REGION! || process.env.CDK_DEFAULT_REGION!;

        GenAIBuilder.builder()
            .account(account)
            .region(region)
            .build(scope, stackId);
    }
}
```