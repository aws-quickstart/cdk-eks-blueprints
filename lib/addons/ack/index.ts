// lib/certmanager_addon.ts
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import merge from "ts-deepmerge";
import { string } from 'zod';
import { ClusterInfo, Values } from "../../spi";
import { createNamespace, setPath } from "../../utils";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from "../helm-addon";
import { serviceMappings } from "./serviceMappings";
/**
 * User provided option for the Helm Chart
 */
export interface AckAddOnProps extends HelmAddOnUserProps {
    /**
     * Default Service Name
     * @default IAM
     */
    serviceName?: AckServiceName;
    /**
     * Managed IAM Policy of the ack controller
     * @default IAMFullAccess
     */
    managedPolicyName?: string;
    /**
     * To Create Namespace using CDK. This should be done only for the first time.
     */    
    createNamespace?: boolean;
    /**
     * To create Service Account
     */    
    saName?: string;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: AckAddOnProps = {
  name: "iam-chart",
  namespace: "ack-system",
  chart: "iam-chart",
  version: "v0.0.13",
  release: "iam-chart",
  repository: `oci://public.ecr.aws/aws-controllers-k8s/iam-chart`,
  values: {},
  managedPolicyName: "IAMFullAccess",
  createNamespace: true,
  saName: "iam-chart"
};

export enum AckServiceName {
  "IAM",
  "RDS" // etc.
}

/**
 * Main class to instantiate the Helm chart
 */
export class AckAddOn extends HelmAddOn {

  readonly options: AckAddOnProps;

  constructor(props?: AckAddOnProps) {
    super({...defaultProps as any, ...props});
    this.options = this.props as AckAddOnProps;
  }

  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    const cluster = clusterInfo.cluster;
    const saName = this.options.saName ?? `${this.options.chart}-sa`;
    this.options.name = this.options.name ?? serviceMappings.IAM.chart;
    this.options.chart = this.options.chart ?? serviceMappings.IAM.chart;
    this.options.repository = this.options.repository ?? `oci://public.ecr.aws/aws-controllers-k8s\${this.options.chart}`;
    

    const sa = cluster.addServiceAccount(`${this.options.chart}-sa`, {
      namespace: this.options.namespace,
      name: saName,
    });

    let values: Values = populateValues(this.options,cluster.stack.region,saName);
    values = merge(values, this.props.values ?? {});

    if(this.options.createNamespace == true){
      // Let CDK Create the Namespace
      const namespace = createNamespace(this.options.namespace! , cluster);
      sa.node.addDependency(namespace);
    }
    
    sa.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName(this.options.managedPolicyName!));
    const chart = this.addHelmChart(clusterInfo, values);
    return Promise.resolve(chart);
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: AckAddOnProps, awsRegion: string, saName: string): Values {
  const values = helmOptions.values ?? {};
  setPath(values, "aws.region", awsRegion);
  setPath(values,"serviceAccount.create", false);
  setPath(values,"serviceAccount.name", saName);
  return values;
}
