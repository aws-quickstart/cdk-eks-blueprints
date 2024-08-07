import * as cdk from 'aws-cdk-lib';
import { Construct } from "constructs";
import * as blueprints from '../../lib';
import BlueprintConstruct from "../blueprint-construct";

const blueprintID = 'blueprint-construct-dev';

export interface BlueprintConstructProps {
    /**
     * Id
     */
    id: string
}

export default class BlueprintIPv4Construct extends BlueprintConstruct {
    constructor(scope: Construct, props: cdk.StackProps) {
        super(scope, props);

        blueprints.EksBlueprint.builder()
            .addOns(...this.addOns)
            .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(undefined, {
                primaryCidr: "10.2.0.0/16",
                secondaryCidr: "100.64.0.0/16",
                secondarySubnetCidrs: ["100.64.0.0/24","100.64.1.0/24","100.64.2.0/24"]
            }))
            .resourceProvider("node-role", this.nodeRole)
            .resourceProvider('apache-airflow-s3-bucket-provider', this.apacheAirflowS3Bucket)
            .resourceProvider('apache-airflow-efs-provider', this.apacheAirflowEfs)
            .clusterProvider(this.clusterProvider)
            .resourceProvider(this.ampWorkspaceName, new blueprints.CreateAmpProvider(this.ampWorkspaceName, this.ampWorkspaceName))
            .teams(...this.teams, new blueprints.EmrEksTeam(this.dataTeam), new blueprints.BatchEksTeam(this.batchTeam))
            .enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.API)
            .build(scope, blueprintID, props);

    }
}

