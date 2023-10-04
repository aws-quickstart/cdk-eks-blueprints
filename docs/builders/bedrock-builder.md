# Bedrock Builder

The `BedrockBuilder` allows you to get started with a builder class to configure required addons as you prepare a blueprint for setting up EKS cluster with access to Bedrock.

The `BedrockBuilder` creates the following:

- An EKS Cluster` with passed k8s version and cluster tags.
- A nodegroup to schedule Gen AI workloads with parameters passed.
- Sets up IRSA with access to Bedrock service.

### Bedrock on EKS Cluster

The below usage helps you with a demonstration to use `BedrockBuilder` to setup required addons as you prepare a blueprint for setting up Bedrock access to a new EKS cluster.

```typescript
import { ApplicationTeam, BedrockBuilder, ClusterInfo } from "@aws-quickstart/eks-blueprints";
import * as blueprints from "@aws-quickstart/eks-blueprints";
import * as spi from '@aws-quickstart/eks-blueprints/dist/spi';
import { Construct } from "constructs";
import { loadYaml, readYamlDocument } from "@aws-quickstart/eks-blueprints/dist/utils";
import { KubectlProvider, ManifestDeployment } from "@aws-quickstart/eks-blueprints/dist/addons/helm-addon/kubectl-provider";

export default class GenAIShowcase {
    constructor(scope: Construct, id: string) {
        const account = process.env.CDK_DEFAULT_ACCOUNT!;
        const region = process.env.CDK_DEFAULT_REGION!;
        const stackID = `${id}-blueprint`;

        const bedrockTeamProps: blueprints.teams.BedrockTeamProps = {
            name: blueprints.utils.valueFromContext(scope, "bedrock.pattern.name", "showcase"),
            namespace: blueprints.utils.valueFromContext(scope, "bedrock.pattern.namespace", "bedrock"),
            createNamespace: true,
            serviceAccountName: 'bedrock-service-account',
            extensionFunction: extensionFunction
        }; 

        BedrockBuilder.builder()
            .account(account)
            .region(region)
            .version('auto')
            .teams(new blueprints.BedrockTeam(bedrockTeamProps))
            .build(scope, stackID);
    }
}

function extensionFunction(team: ApplicationTeam, clusterInfo: ClusterInfo) {
    const values: spi.Values = {
        namespace: team.teamProps.namespace,
        imageName: blueprints.utils.valueFromContext(clusterInfo.cluster, "bedrock.pattern.image.name", undefined),
        imageTag: blueprints.utils.valueFromContext(clusterInfo.cluster, "bedrock.pattern.image.tag", undefined)
    };

    // Apply manifest
    const doc = readYamlDocument(__dirname + '/deployment/showcase-deployment.ytpl');
    const manifest = doc.split("---").map((e: any) => loadYaml(e));

    const manifestDeployment: ManifestDeployment = {
        name: team.teamProps.name,
        namespace: team.teamProps.namespace!,
        manifest,
        values
    };
    const manifestConstruct = new KubectlProvider(clusterInfo).addManifest(manifestDeployment);
    manifestConstruct.node.addDependency(team.serviceAccount);
}
```