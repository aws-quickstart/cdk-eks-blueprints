import { Construct } from "constructs";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { ArchType, arch, dependable, setPath } from "../../utils";
import { ClusterInfo, Values } from "../../spi";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import * as rds from "aws-cdk-lib/aws-rds";
import { CfnOutput } from 'aws-cdk-lib';

const HTTPS = "https://";

/**
 * User provided options for the Helm Chart
 */
export interface BackstageAddOnProps extends HelmAddOnUserProps {
    /**
     * The subdomain that will be assigned to the Backstage application.
     */
    subdomain: string;

    /**
     * The resource name of the certificate to be assigned to the Load Balancer.
     */
    certificateResourceName: string;

    /**
     * The registry URL of the Backstage application's Docker image.
     */
    imageRegistry: string;

    /**
     * The repository name in the "imageRegistry".
     */
    imageRepository: string;

    /**
     * The tag of the Backstage application's Docker image.
     * @default 'latest'
     */
    imageTag?: string;

    /**
     * The resource name of the database.
     */
    databaseResourceName: string;

    /**
     * The name of the Kubernetes Secret which will be created by the add-on and
     * injected with the database credentials.
     */
    databaseSecretTargetName: string;
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps = {
  name: "blueprints-backstage-addon",
  namespace: "backstage",
  chart: "backstage",
  version: "0.17.0",
  release: "backstage",
  repository:  "https://backstage.github.io/charts",
  imageTag: "latest",
  values: {}
};

/**
 * Main class to instantiate the Helm chart
 */
export class BackstageAddOn extends HelmAddOn {

  readonly options: BackstageAddOnProps;

  constructor(props?: BackstageAddOnProps) {
    super({...defaultProps, ...props});
    this.options = this.props as BackstageAddOnProps;
  }
  
  @dependable('AwsLoadBalancerControllerAddOn','ExternalsSecretsAddOn')
  @arch(ArchType.X86)
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    let values: Values = this.populateValues(clusterInfo, this.options);
    const chart = this.addHelmChart(clusterInfo, values);

    new CfnOutput(clusterInfo.cluster.stack, 'Backstage base URL', {
      value: HTTPS + this.options.subdomain,
      description: "Backstage base URL",
      exportName: "BackstageBaseUrl",
    });

    return Promise.resolve(chart);
  }

  /**
  * populateValues populates the appropriate values used to customize the Helm chart
  * @param helmOptions User provided values to customize the chart
  */
  populateValues(clusterInfo: ClusterInfo, helmOptions: BackstageAddOnProps): Values {
    const values = helmOptions.values ?? {};
    
    const annotations = {
      "alb.ingress.kubernetes.io/scheme": "internet-facing",
      "alb.ingress.kubernetes.io/target-type": "ip",
      "alb.ingress.kubernetes.io/certificate-arn": clusterInfo.getResource<ICertificate>(helmOptions.certificateResourceName)?.certificateArn
    };
  
    const databaseInstance: rds.IDatabaseInstance  = clusterInfo.getRequiredResource(helmOptions.databaseResourceName);
    if (databaseInstance === undefined) {
        throw new Error("Database instance not found");
    }
  
    const databaseChartValues = {
      "client": "pg",
      "connection": {
        "host": databaseInstance.dbInstanceEndpointAddress,
        "port": databaseInstance.dbInstanceEndpointPort,
        "user": "${POSTGRES_USER}",
        "password": "${POSTGRES_PASSWORD}"
      }
    };
    
    setPath(values, "ingress.enabled", true);
    setPath(values, "ingress.className", "alb");
    setPath(values, "ingress.host", helmOptions.subdomain);
    setPath(values, "ingress.annotations", annotations);
  
    setPath(values, "backstage.image.registry", helmOptions.imageRegistry);
    setPath(values, "backstage.image.repository", helmOptions.imageRepository);
    setPath(values, "backstage.image.tag", helmOptions.imageTag);
  
    setPath(values, "backstage.appConfig.app.baseUrl", HTTPS + helmOptions.subdomain);
    setPath(values, "backstage.appConfig.backend.baseUrl", HTTPS + helmOptions.subdomain);
    setPath(values, "backstage.appConfig.backend.database", databaseChartValues);

    setPath(values, "backstage.extraEnvVarsSecrets", [helmOptions.databaseSecretTargetName]);
  
    setPath(values, "backstage.command", ["node", "packages/backend", "--config", "app-config.yaml"]);
    
    return values;
  }
}
