// gateway-api-crds-stack.ts
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICluster } from 'aws-cdk-lib/aws-eks-v2';
import { loadExternalYaml } from '../../utils';
import { ClusterInfo, NestedStackBuilder } from '../../spi';
import { NestedStackAddOn, NestedStackAddOnProps } from '../nested-stack';

export const GATEWAY_API_CRD_DEFAULT_VERSION = 'v1.5.0';

export enum GatewayCrdChannel {
    STANDARD = 'standard-install.yaml',
    EXPERIMENTAL = 'experimental-install.yaml',
}

function gatewayApiCrdUrl(version: string, channel: GatewayCrdChannel): string {
    return `https://github.com/kubernetes-sigs/gateway-api/releases/download/${version}/${channel}`;
}

export interface GatewayApiCrdsAddOnProps extends NestedStackProps {
    /**
     * The Gateway API CRD version to install (e.g. 'v1.5.0').
     * @default 'v1.5.0'
     */
    version?: string;
    /**
     * Which channel to install: standard or experimental.
     * @default GatewayCrdChannel.STANDARD
     */
    channel?: GatewayCrdChannel;
    /**
     * Override the full URL to the CRD YAML. Takes precedence over version/channel.
     */
    gatewayApiCrdsUrl?: string;
    cluster?: ICluster;
}

export class GatewayApiCrdsStack extends NestedStack {
    public readonly manifestIds: string[] = [];

    constructor(scope: Construct, id: string, props?: GatewayApiCrdsAddOnProps) {
        super(scope, id, props);

        if (!props?.cluster) {
            throw new Error("GatewayApiCrdsStack: 'cluster' must be provided in props.");
        }

        const cluster = props.cluster;
        const url = props?.gatewayApiCrdsUrl ?? gatewayApiCrdUrl(
            props?.version ?? GATEWAY_API_CRD_DEFAULT_VERSION,
            props?.channel ?? GatewayCrdChannel.STANDARD
        );

        try {
            const yamlDocuments = loadExternalYaml(url)
                .filter((manifest: Record<string, any>) => manifest && manifest.metadata && manifest.metadata.name);

            yamlDocuments.forEach((manifest: Record<string, any>) => {
                const manifestName = `sig-gateway-api-${manifest.metadata.name}`;
                return cluster.addManifest(manifestName, manifest);
            });

        } catch (error) {
            console.error('Error reading or parsing YAML file:', error);
            throw error;
        }
    }
}

export class GatewayApiCrdsBuilder implements NestedStackBuilder {
    readonly options: GatewayApiCrdsAddOnProps;

    constructor(private readonly props?: GatewayApiCrdsAddOnProps) { 
        this.options = this.props as GatewayApiCrdsAddOnProps;
    }

    build(scope: Construct, id: string, nestedStackProps?: NestedStackProps): NestedStack {
        return new GatewayApiCrdsStack(scope, id, {
            ...this.props,
            ...nestedStackProps
        });
    }
}

export class GatewayApiCrdsAddOn extends NestedStackAddOn {
    private readonly options?: GatewayApiCrdsAddOnProps;

    constructor(props?: GatewayApiCrdsAddOnProps) {
        super({
            id: 'GatewayApiCrdsAddOn',
            builder: new GatewayApiCrdsBuilder(),
            nestedStackProps: props
        } as NestedStackAddOnProps);
        this.options = props;
    }

    // Override the deploy method to inject cluster into props
    override deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const cluster = clusterInfo.cluster; // Access cluster from clusterInfo

        if (!cluster) {
            throw new Error("Cluster is required for deployment.");
        }

        const updatedProps: GatewayApiCrdsAddOnProps = {
            ...this.options, 
            cluster,             
        };

        // Get the builder for creating the stack
        const builder = new GatewayApiCrdsBuilder(updatedProps);
        const stack = cluster.stack;

        return Promise.resolve(builder.build(stack, 'gateway-api-crds-stack', updatedProps));
    }
}
