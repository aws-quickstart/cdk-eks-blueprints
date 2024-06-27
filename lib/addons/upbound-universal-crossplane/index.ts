import 'source-map-support/register';
import { Construct } from 'constructs';
import {ClusterInfo, Values} from "../../spi";
import { merge } from "ts-deepmerge";
import {createNamespace, supportsALL} from '../../utils';
import {IRole, Policy, PolicyDocument} from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import {HelmAddOn, HelmAddOnUserProps} from "../helm-addon";

/**
 * User provided options for the Helm Chart
 */
export interface UpboundCrossplaneAddOnProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */
    createNamespace?: boolean;
    /*
     * EKS Cluster Access Role. `mastersRole` of blueprints should be passed to this parameter.
     * A single `masterRole` can be created and passed as input to this parameter.
     * Default: `Admin`
     *
     */
    clusterAccessRole: IRole;
}

const defaultProps = {
    name: 'uxp',
    release: 'blueprints-addon-uxp',
    namespace: 'upbound-system',
    chart: 'universal-crossplane',
    version: '1.14.5-up.1',
    repository: 'https://charts.upbound.io/stable',
    values: {},
    eksMasterRole: `arn:aws:iam::${cluster.stack.account}:role/Admin`
};

@supportsALL
export class UpboundCrossplaneAddOn extends HelmAddOn {

    readonly options: UpboundCrossplaneAddOnProps;

    constructor( props?: UpboundCrossplaneAddOnProps) {
        super({...defaultProps, ...props});

        this.options = this.props as UpboundCrossplaneAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): void | Promise<Construct> {
        const cluster = clusterInfo.cluster;

        // Create the `upbound-system` namespace.
        const ns = createNamespace(this.options.namespace!, cluster, true);

        // Create the CrossPlane AWS Provider IRSA.
        const serviceAccountName = "provider-aws";
        const sa = cluster.addServiceAccount(serviceAccountName, {
            name: serviceAccountName,
            namespace: this.options.namespace!,

        });

        sa.node.addDependency(ns);
        sa.role.attachInlinePolicy(new Policy(cluster.stack, 'eks-connect-policy',  {
            document: PolicyDocument.fromJson({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": ["sts:AssumeRole"],
                        "Resource": `${this.options.clusterAccessRole}`
                    },
                    {
                        "Effect": "Allow",
                        "Action": ["eks:*"],
                        "Resource": `*`
                    }
                ]
            })}));

        clusterInfo.addAddOnContext(UpboundCrossplaneAddOn.name, {
            arn: sa.role.roleArn
        });

        new cdk.CfnOutput(cluster.stack, 'providerawssaiamrole',
            {
                value: sa.role.roleArn,
                description: 'provider AWS IAM role',
                exportName : 'providerawssaiamrole'
            });

        let values: Values = this.options.values ?? {};
        values = merge(values, values);

        const chart = this.addHelmChart(clusterInfo, values, false, true);
        chart.node.addDependency(sa);
        return Promise.resolve(chart);
    }
}