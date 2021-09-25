# Multicluster management

Multicluster management refers to strategies associated with managing and updating your cluster configuration across Amazon EKS clusters. Infrastructure as code (IaC) tools, such as AWS CDK, provide automation and consistency when deploying clusters. You must have the ability to apply the same configurations to as many of your clusters as necessary. Using IaC to define your resources removes the problem of having to generate or apply custom YAML files for each cluster. Defining your cluster resources allows teams to focus on underlying workloads because the infrastructure components are handled by AWS CDK. 

The benefits of using AWS CDK to manage Amazon EKS clusters include the following:

- Consistency across clusters and environments.
- Streamlining access control across an organization.
- Management for multiple clusters.
- Access to GitOps methodologies and best practices.
- Automated lifecycle management for cluster deployment.

Amazon EKS SSP references the [ssp-eks-patterns repository](https://github.com/aws-samples/ssp-eks-patterns), which includes examples of deployment patterns and options for including patterns for multiple clusters that can be deployed across Regions. In the `main.ts` file in the patterns repository, the stacks that define an Amazon EKS cluster and its associated pipelines are deployed to different Regions, as shown in the following snippet:

```typescript
#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
const app = new cdk.App();
//-------------------------------------------
// Single Cluster with multiple teams.
//-------------------------------------------
import MultiTeamConstruct from '../lib/multi-team-construct'
new MultiTeamConstruct(app, 'multi-team');
//-------------------------------------------
// Multiple clusters, multiple regions.
//-------------------------------------------
import MultiRegionConstruct from '../lib/multi-region-construct'
new MultiRegionConstruct(app, 'multi-region');
//-------------------------------------------
// Single Fargate cluster.
//-------------------------------------------
import FargateConstruct from '../lib/fargate-construct'
new FargateConstruct(app, 'fargate');
//-------------------------------------------
// Multiple clusters with deployment pipeline.
//-------------------------------------------
import PipelineStack from '../lib/pipeline-stack'
const account = process.env.CDK_DEFAULT_ACCOUNT
const region = process.env.CDK_DEFAULT_REGION
const env = { account, region }
new PipelineStack(app, 'pipeline', { env });
```

Using AWS CDK, define the Region to deploy your clusters, and use environment variables as a construct in TypeScript, as shown in the previous example. If you deploy all of the stacks in your `main.ts` file, you can view your running clusters by Region using the following command:

```bash
aws eks list-cluster --region <insert region>
```

For example, if you choose Region `us-west-2`, you would get a similar output:
```json
{
    "clusters": [
        "all clusters in this Region"
    ]
}
```

## Multi-Region management 

In a production environment, it is common to have clusters in different locations. Clusters can be in different Regions, on-premises, or part of a hybrid cloud model. Some common design patterns that come into play for managing multiple clusters across operational models include aspects such as high availability, data replication, networking, and traffic routing.

In the `ssp-ek-patterns/lib/` multi-Region-construct directory, there is an `index.ts` file that demonstrates how to deploy multiple clusters to different Regions, as shown in the following example:

```typescript
import * as cdk from '@aws-cdk/core';
// SSP Lib
import * as ssp from '@shapirov/cdk-eks-blueprint'
// Team implementations
import * as team from '../teams'
export default class MultiRegionConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string) {
        super(scope, id);
        // Setup platform team
        const accountID = process.env.CDK_DEFAULT_ACCOUNT!
        const platformTeam = new team.TeamPlatform(accountID)
        const teams: Array<ssp.Team> = [platformTeam];
        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ClusterAutoScalerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];
        const east = 'blueprint-us-east-2'
        new ssp.EksBlueprint(scope, { id: `${id}-${east}`, addOns, teams }, {
            env: { region: east }
        });
        const central = 'blueprint-us-central-2'
        new ssp.EksBlueprint(scope, { id: `${id}-${central}`, addOns, teams }, {
            env: { region: central }
        });
        const west = 'blueprint-us-west-2'
        new ssp.EksBlueprint(scope, { id: `${id}-${west}`, addOns, teams }, {
            env: { region: west }
        });
    }
}
```
This construct imports all of the core components of the Shared Services Platform library, the `Teams` construct, and `Addons` as modules that deploy clusters to different Regions. The take away from this is that we add automation and consistency to the clusters as we deploy them to multiple Regions. All of the components are defined in the Shared Services Platform library, along with `Teams` and `Addons`. 