import { Construct } from 'constructs';
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import { dependable, setPath } from "../../utils";
import {ClusterInfo, GlobalResources, Values} from "../../spi";
import * as rds from "aws-cdk-lib/aws-rds";
import {
    BackstageProps, DiagnosticProps, GlobalProps,
    IngressProps, NetworkProps, MetricsProps,
    PostgresProps, ServiceProps, ServiceAccountProps
} from "./backstage-values";
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
    postgresHost?: string,
    postgresPort?: number,
    postgresUser?: string,
    postgresPassword?: string

    values: {
        backstage: BackstageProps,
        diagnosticMode: DiagnosticProps,
        global: GlobalProps,
        ingress: IngressProps,
        metrics: MetricsProps,
        postgres: PostgresProps,
        networkPolicy: NetworkProps,
        service: ServiceProps,
        serviceAccount: ServiceAccountProps,
    }
}

/**
 * Default props to be used when creating the Helm chart
 */
const defaultProps = {
  name: "blueprints-backstage-addon",
  namespace: "backstage-addon",
  chart: "backstage-addon",
  version: "0.17.0",
  release: "backstage-addon",
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
  @dependable('ExternalSecretsAddOn')
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

  if ( helmOptions.postgresHost == undefined || helmOptions.postgresPort == undefined ||
    helmOptions.postgresUser == undefined || helmOptions.postgresPassword == undefined ) {
    // If helmOptions for postgres aren't defined
    // Check the context

    const context = clusterInfo.getResourceContext();
    const rds = context.get(GlobalResources.Rds) as rds.DatabaseCluster;
    if (rds == undefined) {
      throw new Error("Please define an RDS Cluster as a resource provider");
    }

    const secret = rds.secret;
    if (secret == undefined) {
      throw new Error("RDS Cluster does not have a secret defined");
    }

    const values = secret.secretValue.toJSON();

    database.connection.host = values.host!;
    database.connection.port = values.port!;
    database.connection.user = values.user!;
    database.connection.password = values.password!;
  }

  setPath(values, "ingress.enabled", true);
  setPath(values, "ingress.className", "alb");
  setPath(values, "ingress.host", helmOptions.subdomain);
  setPath(values, "ingress.annotations", annotations);

  setPath(values, "backstage-addon.image.registry", helmOptions.imageRegistry);
  setPath(values, "backstage-addon.image.repository", helmOptions.imageRepository);
  setPath(values, "backstage-addon.image.tag", helmOptions.imageTag);

  setPath(values, "backstage-addon.appConfig.app.baseUrl", helmOptions.baseUrl);
  setPath(values, "backstage-addon.appConfig.backend.baseUrl", helmOptions.baseUrl);
  setPath(values, "backstage-addon.appConfig.backend.database", database);

  setPath(values, "backstage-addon.command", ["node", "packages/backend", "--config", "app-config.yaml"]);

  return values;
}
