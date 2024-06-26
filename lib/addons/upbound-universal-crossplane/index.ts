import 'source-map-support/register';
import { Construct } from 'constructs';
import {ClusterInfo, Values} from "../../spi";
import { merge } from "ts-deepmerge";
import {createNamespace, supportsALL} from '../../utils';
import { Policy, PolicyDocument} from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import {HelmAddOn, HelmAddOnProps, HelmAddOnUserProps} from "../helm-addon";

/**
 * User provided options for the Helm Chart
 */
export interface UpboundCrossplaneAddOnProps extends HelmAddOnUserProps {
    /**
     * To Create Namespace using CDK
     */
    createNamespace?: boolean;
    /*
     * EKS MasterRole
     */
    eksMasterRole?: any;
}

const defaultProps = {
    name: 'uxp',
    release: 'blueprints-addon-uxp',
    namespace: 'upbound-system',
    chart: 'universal-crossplane',
    version: '1.14.5-up.1',
    repository: 'https://charts.upbound.io/stable',
    values: {},
    eksMasterRole: "eks-connector-role"
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
                        "Resource": `arn:aws:iam::${cluster.stack.account}:role/${this.options.eksMasterRole}`
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