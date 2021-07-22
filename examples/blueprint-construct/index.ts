import * as cdk from '@aws-cdk/core';
import { NodegroupAmiType, KubernetesVersion, CapacityType } from '@aws-cdk/aws-eks';
import { InstanceType } from "@aws-cdk/aws-ec2";

// SSP lib.
import * as ssp from '../../lib'

// Example teams.
import * as team from '../teams'

// Network policies.
const networkPoliciesDir = './examples/teams/network-policies'

export default class BlueprintConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
        super(scope, id);

        // Setup platform team.
        const account = props.env!.account!
        const platformTeam = new team.TeamPlatform(account, networkPoliciesDir)

        // Teams for the cluster.
        const teams: Array<ssp.teams.Team> = [
            platformTeam,
            new team.TeamTroi,
            new team.TeamRiker,
            new team.TeamBurnham(scope)
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.addons.AppMeshAddOn,
            new ssp.addons.NginxAddOn,
            new ssp.addons.ArgoCDAddOn,
            new ssp.addons.CalicoAddOn,
            new ssp.addons.MetricsServerAddOn,
            new ssp.addons.ClusterAutoScalerAddOn,
            new ssp.addons.ContainerInsightsAddOn,
            new ssp.addons.AwsLoadBalancerControllerAddOn(),
            new ssp.addons.SSMAgentAddOn()
        ];
        const region = 'us-west-2'
        const clusterProps: ssp.EC2ProviderClusterProps = {
            nodeGroupCapacityType: CapacityType.ON_DEMAND,
            version: KubernetesVersion.V1_20,
            instanceTypes: [new InstanceType('m5.large')],
            amiType: NodegroupAmiType.AL2_X86_64,
            amiReleaseVersion: "1.20.4-20210628"
        }
        const blueprintProps = {
            id: 'test-cdk-ssp-'+region,
            addOns,
            teams,
            clusterProvider: new ssp.EC2ClusterProvider(clusterProps)
        }
        new ssp.EksBlueprint(scope, blueprintProps, props)
    }
}