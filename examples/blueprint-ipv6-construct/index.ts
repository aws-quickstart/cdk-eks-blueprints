import * as cdk from 'aws-cdk-lib';
import { IpFamily } from 'aws-cdk-lib/aws-eks';
import { Construct } from "constructs";
import * as blueprints from '../../lib';
import BlueprintConstruct, {
    addGenericNodeGroup,
    addGpuNodeGroup,
    addWindowsNodeGroup,
    getClusterProvider
} from "../blueprint-construct";

const blueprintID = 'blueprint-ipv6-construct-dev';

export interface BlueprintIPv6ConstructProps {
    /**
     * Id
     */
    id: string
}

/*
** This class is modification of ../blueprint-contruct/index.ts
** To have IPv6 configurations, BlueprintConstruct has been replicated and updated to BlueprintIPV6Construct.
 */
export default class BlueprintIPV6Construct extends BlueprintConstruct {
    constructor(scope: Construct, props: cdk.StackProps) {
        super(scope, props);

        const nodeRole = new blueprints.CreateIPv6NodeRoleProvider("blueprint-node-role");
        // Excluded addCustomNodeGroup compared to IPV4 cluster. As it is not yet supported for IPV6 cluster.
        this.clusterProvider = getClusterProvider([
            addGenericNodeGroup(),
            addWindowsNodeGroup(), //  commented out to check the impact on e2e
            addGpuNodeGroup()
        ]);

        const addOns: Array<blueprints.ClusterAddOn> = [
            new blueprints.addons.KarpenterAddOn({
                version: "v0.37.5",
                nodePoolSpec: this.nodePoolSpec,
                ec2NodeClassSpec: this.nodeClassSpec,
                interruptionHandling: true,
            }),
            new blueprints.addons.SecretsStoreAddOn(),
        ];

        // Instantiated to for helm version check.
        new blueprints.ExternalDnsAddOn({
            hostedZoneResources: [ blueprints.GlobalResources.HostedZone ]
        });

        blueprints.EksBlueprint.builder()
            .addOns(...addOns)
            .resourceProvider(blueprints.GlobalResources.Vpc, new blueprints.VpcProvider(undefined))
            .resourceProvider("node-role", nodeRole)
            .ipFamily(IpFamily.IP_V6)
            .clusterProvider(this.clusterProvider)
            .teams(...this.teams)
            .build(scope, blueprintID, props);
    }
}

