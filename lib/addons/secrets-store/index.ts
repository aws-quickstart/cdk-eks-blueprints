import { Construct } from '@aws-cdk/core';
import { ClusterAddOn, ClusterInfo } from '../../spi';
import { CsiDriverProviderAws } from './csi-driver-provider-aws';

/**
 * Configuration options for Secrets Store AddOn
 */
export interface SecretsStoreAddOnProps {
    /**
     * Namespace where Secrets Store CSI driver will be installed
     * @default 'kube-system'
     */
    readonly namespace?: string;

    /**
     * Version of the Secrets Store CSI Driver. Eg. v0.0.23
     * @default 'v0.0.23/'
     */
    readonly version?: string;

    /**
     * Rotation Poll Interval, e.g. '120s'.
     * @default undefined
     * If provided, sets auto rotation to true and sets the polling interval.
     */
    readonly rotationPollInterval?: string;

    /**
     * Enable Sync Secrets to kubernetes secrets
     */
    readonly syncSecrets?: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps: SecretsStoreAddOnProps = {
    namespace: 'kube-system',
    version: 'v0.0.23',
    rotationPollInterval: undefined,
    syncSecrets: true,
}

export class SecretsStoreAddOn implements ClusterAddOn {

    private props: SecretsStoreAddOnProps;

    constructor(props?: SecretsStoreAddOnProps) {
        this.props = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const csiDriverProviderAws = new CsiDriverProviderAws(
            this.props.namespace!,
            this.props.version!,
            this.props.rotationPollInterval,
            this.props.syncSecrets!
        );

        return Promise.resolve(csiDriverProviderAws.deploy(clusterInfo));
    }
}
