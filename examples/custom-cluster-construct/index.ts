import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as eks from '@aws-cdk/aws-eks'
// SSP Lib
import * as ssp from '../../lib'

// Team implementations
import * as team from '../teams'
import {kubernetesVersionContext, valueFromContext} from "../../lib/utils/context-utils"
import { EC2ClusterProvider } from '../../lib/cluster-providers/ec2-cluster-provider'

const INSTANCE_TYPE_KEY = "eks.default.instance-type"


export default class CustomClusterConstruct extends cdk.Construct {
    constructor(scope: cdk.Construct, id: string,  props?: cdk.StackProps) {
        super(scope, id)

        // Setup platform team
        const accountID = props?.env?.account
        const platformTeam = new team.TeamPlatform(<string>accountID)
        const teams: Array<ssp.Team> = [platformTeam]


        // AddOns for the cluster.
        const addOns: Array<ssp.ClusterAddOn> = [
            new ssp.NginxAddOn,
            new ssp.ArgoCDAddOn,
            new ssp.CalicoAddOn,
            new ssp.MetricsServerAddOn,
            new ssp.ContainerInsightsAddOn,
        ];

        const kubernetesVersion =kubernetesVersionContext(scope)

        const instanceType = valueFromContext(scope, INSTANCE_TYPE_KEY, null )
        const clusterProps: ssp.EC2ProviderClusterProps = {
            version: kubernetesVersion,
            instanceTypes: [new ec2.InstanceType(instanceType)],
            amiType: eks.NodegroupAmiType.AL2_X86_64
        }

        const stackID = `${id}-blueprint`
        let clusterProvider: EC2ClusterProvider;
        clusterProvider = new ssp.EC2ClusterProvider(scope, clusterProps);
        new ssp.EksBlueprint(scope, { id: stackID, teams, addOns, clusterProvider })
    }
}


