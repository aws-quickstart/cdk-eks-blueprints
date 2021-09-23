import { Construct } from '@aws-cdk/core';
import { Team } from './team-contracts';
import * as types from './types';

/**
 * ClusterAddOn is the interface to which all Cluster addons should conform.
 * If the Promise<Construct> is returned then the framework will ensure promises
 * are resolved before the Teams setup() and postDeploy() methods are invoked.
 * If void is returned, then no dependency features apply.
 * @param clusterInfo
 * @returns Promise<cdk.Construct> | void
 */
export declare interface ClusterAddOn {
    
    /** 
     * Optional identifier of the addon. This is needed for add-ons that can be added multiple times to the blueprint.
    */
    id? : string;

    deploy(clusterInfo: types.ClusterInfo): Promise<Construct> | void;
}

/**
 * Optional interface to allow cluster bootstrapping after provisioning of add-ons and teams is complete.
 * Can be leveraged to bootstrap workloads, perform cluster checks. 
 * ClusterAddOn implementation may implement this interface in order to get post deployment hook point.
 */
export declare interface ClusterPostDeploy {
    postDeploy(clusterInfo: types.ClusterInfo, teams: Team[]): void;
}

