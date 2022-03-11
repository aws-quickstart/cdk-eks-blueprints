import * as iam from "@aws-cdk/aws-iam";
import { ClusterInfo, ClusterPostDeploy, Team } from '@aws-quickstart/ssp-amazon-eks/dist/spi';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { Construct } from '@aws-cdk/core';
import * as ssp from '@aws-quickstart/ssp-amazon-eks';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '@aws-quickstart/ssp-amazon-eks/dist/addons/helm-addon';
import { createNamespace } from "@aws-quickstart/ssp-amazon-eks/dist/utils";
import { KastenEC2IamPolicy } from "./iam-policy";


export type KastenK10AddOnProps = HelmAddOnUserProps;


const K10_SA = 'k10-sa-ssp';

/**
 * Properties available to configure Kasten K10.
 * namespace default is kasten-io
 * version default is 4.5.6
 * values as per https://docs.kasten.io
 */
const defaultProps = {
    name: 'kasten',
    release: 'k10',
    namespace: 'kasten-io',
    createNamespace: true,
    chart: 'k10',
    repository: "https://charts.kasten.io/",
    version: '4.5.6'
}

export class KastenK10AddOn extends HelmAddOn  {

   // private options: KastenK10AddOnProps;
    
    readonly options: KastenK10AddOnProps;
    
    constructor(props?: KastenK10AddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as KastenK10AddOnProps;
    }

    deploy(clusterInfo: ssp.ClusterInfo): void | Promise<Construct> {

        const cluster = clusterInfo.cluster;

        const namespace = createNamespace('kasten-io', cluster);

        //Create Service Account
        const serviceAccount = cluster.addServiceAccount('k10-sa-ssp', {
            name: K10_SA,
            namespace: this.options.namespace,
        });

        //Populate Service Account with Infput from iam-policy.ts
        KastenEC2IamPolicy.Statement.forEach((statement) => {
            serviceAccount.addToPrincipalPolicy(iam.PolicyStatement.fromJson(statement));
        });

        //const chart = this.addHelmChart(clusterInfo, values);
        
        const KastenK10Chart = this.addHelmChart(clusterInfo, {
            clusterName: cluster.clusterName,
            serviceAccount: {
                create: false,
                name: serviceAccount.serviceAccountName,
            },

        });

        KastenK10Chart.node.addDependency(serviceAccount);

        return Promise.resolve(KastenK10Chart);
    }
    
    
}





