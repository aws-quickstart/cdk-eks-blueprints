import { ClusterInfo } from ".";

/**
 * Interface for a team. 
 */
 export interface Team {
    /**
     * Team name, expected to be unique
     */
    name: string;

    /**
     * Setup method is invoked in the lifecycle of cluster provisioning 
     * after add-ons are provisioned but before and post deployment hooks. 
     * @param clusterInfo 
     */
    setup(clusterInfo: ClusterInfo): void;
}