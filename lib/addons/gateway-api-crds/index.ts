// gateway-api-crds-stack.ts
import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { ICluster } from 'aws-cdk-lib/aws-eks';
import { loadExternalYaml } from '../../utils';
import { ClusterInfo, NestedStackBuilder } from '../../spi';
import { NestedStackAddOn, NestedStackAddOnProps } from '../nested-stack';

export const GatewayCrdChannels = {
    STANDARD: 'https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/standard-install.yaml',
    EXPERIMENTAL: 'https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.2.0/experimental-install.yaml',
};

export interface GatewayApiCrdsAddOnProps extends NestedStackProps {
    gatewayApiCrdsUrl?: string;
    cluster?: ICluster;
}

const defaultProps: GatewayApiCrdsAddOnProps = {
    gatewayApiCrdsUrl: GatewayCrdChannels.STANDARD
};

export class GatewayApiCrdsStack extends NestedStack {
    public readonly manifestIds: string[] = [];

    constructor(scope: Construct, id: string, props?: GatewayApiCrdsAddOnProps) {
        super(scope, id, props);

        if (!props?.cluster) {
            throw new Error("GatewayApiCrdsStack: 'cluster' must be provided in props.");
        }

        const cluster = props.cluster;
        const url = props?.gatewayApiCrdsUrl ?? defaultProps.gatewayApiCrdsUrl;

        try {
            const yamlDocuments = loadExternalYaml(url!)
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
            id: 'gateway-api-crds',
            builder: new GatewayApiCrdsBuilder(),
            nestedStackProps: props
        } as NestedStackAddOnProps);
        this.options = props
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