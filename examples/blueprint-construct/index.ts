import * as cdk from '@aws-cdk/core';
import { Vpc } from '@aws-cdk/aws-ec2';

// SSP lib.
import * as ssp from '../../lib'

// Example teams.
import * as team from '../teams'

const burnhamManifestDir = './examples/teams/team-burnham/'
const rikerManifestDir = './examples/teams/team-riker/'
const teamManifestDirList = [burnhamManifestDir,rikerManifestDir]

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
            new team.TeamRiker(scope, teamManifestDirList[1]),
            new team.TeamBurnham(scope, teamManifestDirList[0])
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
            new ssp.addons.CalicoAddOn(),
            new ssp.addons.MetricsServerAddOn(),
            new ssp.addons.ClusterAutoScalerAddOn(),
            new ssp.addons.ContainerInsightsAddOn(),
            new ssp.addons.AwsLoadBalancerControllerAddOn(),
            new ssp.addons.SecretsStoreAddOn(),
            new ssp.addons.SSMAgentAddOn(),
            new ssp.addons.NginxAddOn(),
            new ssp.addons.VpcCniAddOn(),
            new ssp.addons.CoreDnsAddOn(),
            new ssp.addons.KubeProxyAddOn()
        ];

        const blueprintID = `${blueprintProps.id}-dev`
        new ssp.EksBlueprint(scope, { id: blueprintID, addOns, teams, vpc: blueprintProps.vpc }, props)
    }
}
