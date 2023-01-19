import { ClusterInfo, ClusterPostDeploy, Team } from "../../spi";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";

/**
 * Properties available to configure opa gatekeeper.
 * namespace default is gatekeeper-system
 * version default is 3.11.0
 * values as per https://github.com/open-policy-agent/gatekeeper/tree/master/charts/gatekeeper
 */
export type OpaGatekeeperAddOnProps = HelmAddOnUserProps;

/**
 * Defaults options for the gatekeeper add-on
 */

const defaultProps: HelmAddOnProps = {
    name: 'gatekeeper',
    release: 'blueprints-addon-opa-gatekeeper',
    namespace: 'gatekeeper-system',
    chart: 'gatekeeper',
    repository: "https://open-policy-agent.github.io/gatekeeper/charts",
    version: '3.11.0'
};

export class OpaGatekeeperAddOn extends HelmAddOn implements ClusterPostDeploy {

    private options: OpaGatekeeperAddOnProps;

    constructor(props?: OpaGatekeeperAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props;
    }

    deploy(_clusterInfo: ClusterInfo): void {
        return;
    }

    postDeploy(clusterInfo: ClusterInfo, _teams: Team[]): void {

        const chart = this.addHelmChart(clusterInfo, this.props.values ?? {});
        
        for (let provisioned of clusterInfo.getAllProvisionedAddons().values()) {
            chart.node.addDependency(provisioned);
        }
    }
    
}