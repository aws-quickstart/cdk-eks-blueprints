import { NestedStackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ClusterAddOn, ClusterInfo, NestedStackBuilder } from "../../spi";
import { supportsALL } from "../../utils";

/**
 * Properties for the nested stack add-on.
 */
export class NestedStackAddOnProps {
    /**
     * Required identified, must be unique within the parent stack scope.
     */
    id: string;

    /**
     * Builder that generates the stack.
     */
    builder: NestedStackBuilder;

    /**
     * Optional properties for the nested stack.
     */
    nestedStackProps?: NestedStackProps;
}

@supportsALL
export class NestedStackAddOn  implements ClusterAddOn {

    readonly id? : string;

    constructor(private readonly props: NestedStackAddOnProps) {
        this.id = props.id;
    }

    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const props = this.props;
        const stack = clusterInfo.cluster.stack;
        return Promise.resolve(props.builder.build(stack, props.id,props.nestedStackProps));
    }

}