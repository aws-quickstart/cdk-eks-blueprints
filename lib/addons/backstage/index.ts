import { Construct } from 'constructs';
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { dependable, setPath } from "../../utils";
import { ClusterInfo, Values } from "../../spi";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";

/**
 * User provided options for the Helm Chart
 */
export interface BackstageAddOnProps extends HelmAddOnUserProps {
    version?: string,
    name?: string, 
    createNamespace?: boolean,
    namespace?: string,
    subdomain: string,
    certificateResourceName: string,
    imageRegistry: string,
    imageRepository: string,
    imageTag?: string,
    baseUrl: string,
    postgresHost: string,
    postgresPort?: number,
    postgresUser?: string,
    postgresPassword: string
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
  postgresPort: 5432,
  postgresUser: "postgres",
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
  
  @dependable('AwsLoadBalancerControllerAddOn')
  deploy(clusterInfo: ClusterInfo): Promise<Construct> {
    let values: Values = populateValues(clusterInfo, this.options);
    const chart = this.addHelmChart(clusterInfo, values);

    return Promise.resolve(chart);
  }
}

/**
 * populateValues populates the appropriate values used to customize the Helm chart
 * @param helmOptions User provided values to customize the chart
 */
function populateValues(clusterInfo: ClusterInfo, helmOptions: BackstageAddOnProps): Values {
  const values = helmOptions.values ?? {};
  
  const annotations = {
    "alb.ingress.kubernetes.io/scheme": "internet-facing",
    "alb.ingress.kubernetes.io/target-type": "ip",
    "alb.ingress.kubernetes.io/certificate-arn": clusterInfo.getResource<ICertificate>(helmOptions.certificateResourceName)?.certificateArn
  };
  
  const database = {
    "client": "pg",
    "connection": {
      "host": helmOptions.postgresHost,
      "port": helmOptions.postgresPort,
      "user": helmOptions.postgresUser,
      "password": helmOptions.postgresPassword,
    }
  };
  
  setPath(values, "ingress.enabled", true);
  setPath(values, "ingress.className", "alb");
  setPath(values, "ingress.host", helmOptions.subdomain);
  setPath(values, "ingress.annotations", annotations);

  setPath(values, "backstage.image.registry", helmOptions.imageRegistry);
  setPath(values, "backstage.image.repository", helmOptions.imageRepository);
  setPath(values, "backstage.image.tag", helmOptions.imageTag);

  setPath(values, "backstage.appConfig.app.baseUrl", helmOptions.baseUrl);
  setPath(values, "backstage.appConfig.backend.baseUrl", helmOptions.baseUrl);
  setPath(values, "backstage.appConfig.backend.database", database);
  
  setPath(values, "backstage.command", ["node", "packages/backend", "--config", "app-config.yaml"]);
  
  return values;
}
