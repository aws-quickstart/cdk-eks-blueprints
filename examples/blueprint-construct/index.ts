import * as cdk from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';

// SSP lib.
import * as ssp from '../../lib'

// Example teams.
import * as team from '../teams'

export interface BlueprintConstructProps {
    /**
     * Id
     */
    id: string;

    /**
     * EC2 VPC
     */
    vpc?: Vpc;
}
export default class BlueprintConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, blueprintProps: BlueprintConstructProps, props: cdk.StackProps) {
        super(scope, blueprintProps.id);

        // TODO: fix IAM user provisioning for admin user
        // Setup platform team.
        //const account = props.env!.account!
        // const platformTeam = new team.TeamPlatform(account)

        // Teams for the cluster.
        const teams: Array<ssp.Team> = [
            new team.TeamTroi,
            new team.TeamRiker,
            new team.TeamBurnham(scope)
        ];
        const prodBootstrapArgo = new ssp.addons.ArgoCDAddOn({
            bootstrapRepo: {
                repoUrl: 'https://github.com/aws-samples/ssp-eks-workloads.git',
                path: 'envs/prod',
            }
        });
        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.addons.AppMeshAddOn(),
            prodBootstrapArgo,
            new ssp.addons.NginxAddOn(),
            new ssp.addons.CalicoAddOn(),
            new ssp.addons.MetricsServerAddOn(),
            new ssp.addons.ClusterAutoScalerAddOn(),
            new ssp.addons.ContainerInsightsAddOn(),
            new ssp.addons.AwsLoadBalancerControllerAddOn(),
            new ssp.addons.SecretsStoreAddOn(),
            new ssp.addons.SSMAgentAddOn()
        ];

        const blueprintID = `${blueprintProps.id}-dev`
        new ssp.EksBlueprint(scope, { id: blueprintID, addOns, teams, vpc: blueprintProps.vpc }, props)
    }
}
