import { App } from 'aws-cdk-lib';
import * as blueprints from '../../../lib';
import { logger } from '../../../lib/utils';

export function build(app: App) {
    const account = process.env.CDK_DEFAULT_ACCOUNT!;
    const region = process.env.CDK_DEFAULT_REGION!;
    
    logger.settings.minLevel = 3;
    blueprints.HelmAddOn.validateHelmVersions = true;

    const blueprint = blueprints.EksBlueprint.builder()
        .account(account) // the supplied default will fail, but build and synth will pass
        .region(region)
        .version('auto')
        .addOns(
            new blueprints.AwsLoadBalancerControllerAddOn,
            new blueprints.CertManagerAddOn,
            new blueprints.AdotCollectorAddOn,
            new blueprints.NginxAddOn,
        );

    blueprints.CodePipelineStack.builder()
        .application("npx ts-node bin/main.ts")
        .name("blueprints-eks-pipeline")
        .owner("aws-quickstart")
        .codeBuildPolicies(blueprints.DEFAULT_BUILD_POLICIES)
        .repository({
            repoUrl: 'cdk-eks-blueprints',
            credentialsSecretName: 'github-token',
            targetRevision: 'main',
            path: "examples/monorepo",
            trigger: blueprints.GitHubTrigger.POLL
        })
        .stage({
            id: `${region}-sandbox`,
            stackBuilder: blueprint.clone(region)
        })
        .build(app, "pipeline", { env: { region, account }});
}