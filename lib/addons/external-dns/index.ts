import { Effect, PolicyStatement } from '@aws-cdk/aws-iam';
import { IHostedZone } from '@aws-cdk/aws-route53';
import { ClusterAddOn, ClusterInfo } from '../../stacks/cluster-types';

export interface ExternalDnsProps {
  /**
   * @default `dns`
   */
  readonly namespace?: string;

  /**
   * @default `5.0.2`
   */
  readonly version?: string;

  readonly hostedZones: IHostedZone[];
}


export class ExternalDnsAddon implements ClusterAddOn {
  
    public readonly name = 'external-dns';

    constructor(private readonly options: ExternalDnsProps) {
    }

  deploy(clusterInfo: ClusterInfo): void {
    const region = clusterInfo.cluster.stack.region;

    const namespace = new Namespace(scope, 'AwsForFluentBitAddonNamespace', {
      platform,
      metadata: {
        name: this.props.namespaceName ?? 'dns',
      },
    });

    const serviceAccount = new ServiceAccount(scope, 'ServiceAccount', {
      platform,
      metadata: {
        name: 'external-dns',
        namespace: namespace.name,
      },
    });

    serviceAccount.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['route53:ChangeResourceRecordSets', 'route53:ListResourceRecordSets'],
        resources: this.props.hostedZones.map((hostedZone) => hostedZone.hostedZoneArn),
      }),
    );

    serviceAccount.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['route53:ListHostedZones'],
        resources: ['*'],
      }),
    );

    serviceAccount.node.addDependency(namespace);

    const chart = new HelmChart(scope, 'ExternalDnsAddonChart', {
      cluster: platform.cluster,
      namespace: 'kube-system',
      repository: 'https://charts.bitnami.com/bitnami',
      chart: 'external-dns',
      release: 'external-dns',
      version: this.props.version ?? '5.0.2',
      values: {
        provider: 'aws',
        zoneIdFilters: this.props.hostedZones.map((hostedZone) => hostedZone.hostedZoneId),
        aws: {
          region,
        },
        serviceAccount: {
          create: false,
          name: serviceAccount.name,
        },
      },
    });

    chart.node.addDependency(namespace);
  }
}