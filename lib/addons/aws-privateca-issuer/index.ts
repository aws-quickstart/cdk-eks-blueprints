// lib/kubevious_addon.ts
import { Construct } from 'constructs';
import { ManagedPolicy } from "aws-cdk-lib/aws-iam";
import merge from "ts-deepmerge";
import { ServiceAccount } from 'aws-cdk-lib/aws-eks';
import { HelmAddOn, HelmAddOnUserProps, HelmAddOnProps } from "../helm-addon";
import { dependable, setPath, createNamespace } from '../../utils';
import { ClusterInfo, Values } from "../../spi";

/**
 * User provided options for the Helm Chart
 */
export interface AWSPrivateCAIssuerAddonProps extends HelmAddOnUserProps {

    /**
     * The name of the service account to use. If createServiceAccount is true, a serviceAccountName is generated.
     */
    serviceAccountName?: string;
    /**
     * An array of Managed IAM Policies which Service Account needs for IRSA Eg: irsaRoles:["AWSCertificateManagerPrivateCAFullAccess"]. If not empty
     * Service Account will be Created by CDK with IAM Roles Mapped (IRSA). In case if its empty, Service Account will be created with default IAM Policy AWSCertificateManagerPrivateCAFullAccess
     */   
     iamPolicies?: string[];    
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps: HelmAddOnProps & AWSPrivateCAIssuerAddonProps = {
  name: "blueprints-aws-pca-issuer-addon",
  chart: "aws-privateca-issuer",
  namespace:"aws-pca-issuer",
  version: "1.2.4",
  release: "aws-pca-issuer",
  repository:  "https://cert-manager.github.io/aws-privateca-issuer",
  values: {},
  serviceAccountName: "aws-pca-issuer",
  iamPolicies: ["AWSCertificateManagerPrivateCAFullAccess"]

};

/**
 * Main class to instantiate the Helm chart
 */
export class AWSPrivateCAIssuerAddon extends HelmAddOn {

  readonly options: AWSPrivateCAIssuerAddonProps;

  constructor(props?: AWSPrivateCAIssuerAddonProps) {
    super({...defaultProps, ...props});
    this.options = this.props as AWSPrivateCAIssuerAddonProps;
  }

  // AWSPrivateCAIssuerAddon requires CertManagerAddOn as a prerequisite . Pls refer to documentation for more details
  @dependable('CertManagerAddOn')
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    //Create Service Account with IRSA
    const cluster = clusterInfo.cluster;
    let values: Values = populateValues(this.options);
    values = merge(values, this.props.values ?? {});

    const chart = this.addHelmChart(clusterInfo, values);
    const namespace = createNamespace(this.options.namespace! , cluster);

    if (this.options.iamPolicies!.length > 0 ) {
      //Create Service Account with IRSA
      const opts = { name: this.options.serviceAccountName, namespace: this.options.namespace };
      const sa = cluster.addServiceAccount(this.options.serviceAccountName!, opts);
      setRoles(sa,this.options.iamPolicies!);
      sa.node.addDependency(namespace);
      chart.node.addDependency(sa);
     } 
     return Promise.resolve(chart);
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(helmOptions: AWSPrivateCAIssuerAddonProps): Values {
  const values = helmOptions.values ?? {};
  setPath(values, "serviceAccount.create",  helmOptions.iamPolicies!.length > 0 ? false : true); 
  setPath(values, "serviceAccount.name",  helmOptions.serviceAccountName); 
  return values;
}

/**
 * This function will set the roles to Service Account
 * @param sa - Service Account Object
 * @param irsaRoles - Array  of Managed IAM Policies
 */
 function setRoles(sa:ServiceAccount, irsaRoles: string[]){
  irsaRoles.forEach((policyName) => {
      const policy = ManagedPolicy.fromAwsManagedPolicyName(policyName);
      sa.role.addManagedPolicy(policy);
    });
}