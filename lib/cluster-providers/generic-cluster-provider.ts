import { Construct } from "@aws-cdk/core";
import { ClusterInfo, ClusterProvider } from "../spi";
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import { ManagedNodeGroup, SelfManagedNodeGroup } from "./types";
import * as constants from './constants';
import { valueFromContext } from "../utils";


export interface GenericClusterProviderProps extends eks.CommonClusterOptions {
    name: string,

    privateCluster: boolean,
    /**
     * Subnets are passed to the cluster configuration.
     * This will be used for ENI allocation for the control plane.
     */
    vpcSubnets?: ec2.SubnetSelection[];

    managedNodeGroups?: ManagedNodeGroup[];

    selfManagedNodeGroups: SelfManagedNodeGroup[];

    fargateProfiles?: {
        [key: string]: eks.FargateProfileOptions;
    }
}

export class GenericClusterProvider implements ClusterProvider {

    constructor(private readonly props: GenericClusterProviderProps){}

    createCluster(scope: Construct, vpc: ec2.IVpc): ClusterInfo {
        const id = scope.node.id;

        // Props for the cluster.
        const clusterName = this.props.name ?? id;
        const outputClusterName = true;
        const version = this.props.version;
        const privateCluster = this.props.privateCluster ?? valueFromContext(scope, constants.PRIVATE_CLUSTER, false);
        const endpointAccess = (privateCluster === true) ? eks.EndpointAccess.PRIVATE : eks.EndpointAccess.PUBLIC_AND_PRIVATE;
        const vpcSubnets = (privateCluster === true) ? [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }] : this.props.vpcSubnets;

        // Create an EKS Cluster
        const cluster = new eks.Cluster(scope, id, {
            vpc,
            clusterName,
            outputClusterName,
            version,
            vpcSubnets,
            endpointAccess,
            defaultCapacity: 0 // we want to manage capacity ourselves
        });

    }

    public addManagedNodeGroups(cluster: eks.Cluster, nodeGroup: ManagedNodeGroup) : eks.Nodegroup {
        const amiType = this.props.amiType;
        const capacityType = this.props.nodeGroupCapacityType;
        const releaseVersion = this.props.amiReleaseVersion;
        const instanceTypes = this.props.instanceTypes ?? [valueFromContext(scope, constants.INSTANCE_TYPE_KEY, constants.DEFAULT_INSTANCE_TYPE)];
        const minSize = this.props.minSize ?? valueFromContext(scope, constants.MIN_SIZE_KEY, constants.DEFAULT_NG_MINSIZE);
        const maxSize = this.props.maxSize ?? valueFromContext(scope, constants.MAX_SIZE_KEY, constants.DEFAULT_NG_MAXSIZE);
        const desiredSize = this.props.desiredSize ?? valueFromContext(scope, constants.DESIRED_SIZE_KEY, minSize);

        // Create a managed node group.
        const commonNodegroupProps = {
            capacityType,
            instanceTypes,
            minSize,
            maxSize,
            desiredSize,
        };

        let nodegroupProps: eks.NodegroupOptions;
        if(this.props.customAmi) {
            // Create launch template if custom AMI is provided.
            const lt = new ec2.LaunchTemplate(scope, `${id}-lt`, {
                machineImage: this.props.customAmi?.machineImage,
                userData: this.props.customAmi?.userData,
            });
            nodegroupProps = {
                ...commonNodegroupProps,
                launchTemplateSpec: {
                    id: lt.launchTemplateId!,
                    version: lt.latestVersionNumber,
                },
            };
        } else {
            nodegroupProps = {
                ...commonNodegroupProps,
                amiType,
                releaseVersion,
            };
        }

        const mng = cluster.addNodegroupCapacity(id + "-ng", nodegroupProps);

    }

}