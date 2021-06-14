import { Construct } from "@aws-cdk/core"
import * as ec2 from "@aws-cdk/aws-ec2"
import * as eks from "@aws-cdk/aws-eks"

import { ClusterInfo, ClusterProvider } from "../stacks/eks-blueprint-stack"
import {valueFromContext} from "../utils/context-utils"
import {InstanceClass, InstanceSize, InstanceType} from "@aws-cdk/aws-ec2"

const DEFAULT_INSTANCE_TYPES = [InstanceType.of(InstanceClass.M5, InstanceSize.LARGE)]
/**
 * Default min size of MNG
 */
const DEFAULT_NG_MINSIZE = 1
/**
 * Default max size for MNG
 */
const DEFAULT_NG_MAXSIZE = 3

const INSTANCE_TYPE_KEY = "eks.bottlerocket.instance-type"

const MIN_SIZE_KEY = "eks.default.min-size"

const MAX_SIZE_KEY = "eks.default.max-size"

const DESIRED_SIZE_KEY = "eks.default.desired-size"


export class BottlerocketClusterProvider implements ClusterProvider {


    createCluster(scope: Construct, vpc: ec2.IVpc, version: eks.KubernetesVersion): ClusterInfo {

        const cluster = new eks.Cluster(scope, scope.node.id, {
            vpc: vpc,
            clusterName: scope.node.id,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: version,
        })

        // Allow Context To have instances sizing
        const instanceTypes = valueFromContext(scope, INSTANCE_TYPE_KEY, DEFAULT_INSTANCE_TYPES);
        const minSize =  valueFromContext(scope, MIN_SIZE_KEY, DEFAULT_NG_MINSIZE);
        const maxSize =  valueFromContext(scope, MAX_SIZE_KEY, DEFAULT_NG_MAXSIZE);
        const desiredSize =  valueFromContext(scope, DESIRED_SIZE_KEY, minSize);
        const nodeGroup = cluster.addAutoScalingGroupCapacity('BottlerocketNodes', {
            instanceType: instanceTypes,
            minCapacity: minSize,
            maxCapacity: maxSize,
            desiredCapacity: desiredSize
        });

        return { cluster: cluster, autoscalingGroup: nodeGroup, version }
    }

}