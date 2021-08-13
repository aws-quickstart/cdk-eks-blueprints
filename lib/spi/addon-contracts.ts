import { Team, ClusterInfo } from '.';
import { Construct } from '@aws-cdk/core';

/**
 * ClusterAddOn is the interface to which all Cluster addons should conform.
 * If the Promise<Construct> is returned then the framework will ensure promises
 * are resolved before the Teams setup() and postDeploy() methods are invoked.
 * If void is returned, then no dependency features apply.
 * @param clusterInfo
 * @returns Promise<cdk.Construct> | void
 */
export declare interface ClusterAddOn {
    deploy(clusterInfo: ClusterInfo): Promise<Construct> | void;
}

/**
 * Optional interface to allow cluster bootstrapping after provisioning of add-ons and teams is complete.
 * Can be leveraged to bootstrap workloads, perform cluster checks. 
 * ClusterAddOn implementation may implement this interface in order to get post deployment hook point.
 */
export declare interface ClusterPostDeploy {
    postDeploy(clusterInfo: ClusterInfo, teams: Team[]): void;
}