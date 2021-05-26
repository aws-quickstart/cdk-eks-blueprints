import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as eks from '@aws-cdk/aws-eks';
// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'

export default class CustomClusterStack extends cdk.Stack {
    constructor(app: cdk.App, id: string, props?: cdk.StackProps) {
        super(app, id, props);

        // Teams for the cluster.
        const teams: Array<ssp.Team> = [
            new team.TeamPlatform,
        ];

        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddon,
            new ssp.ArgoCDAddon,
            new ssp.CalicoAddon,
            new ssp.MetricsServerAddon,
            new ssp.ClusterAutoScalerAddon,
            new ssp.ContainerInsightsAddOn,
        ];

        const clusterProps: ssp.EC2ProviderClusterProps = {
            version: eks.KubernetesVersion.V1_19,
            instanceType: new ec2.InstanceType('t3.large'),
            amiType: eks.NodegroupAmiType.AL2_X86_64
        }

        const clusterProvider = new ssp.EC2ClusterProvider(clusterProps);
        new ssp.EksBlueprint(app, { id: "test-cluster-provider", clusterProvider });
    }
}


