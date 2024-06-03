import * as cdk from 'aws-cdk-lib';
import * as blueprints from '@aws-quickstart/eks-blueprints';
import * as iam from 'aws-cdk-lib/aws-iam'; // Import for IAM
import * as eks from 'aws-cdk-lib/aws-eks';

// Correcting the import for AckServiceName if necessary
// If AckServiceName is correctly imported, ensure the names used are correctly defined in the imported module.
import { AckServiceName, EksPodIdentityAgentAddOn } from '@aws-quickstart/eks-blueprints';
import { KubernetesIngressAddOn } from '../lib/addons/kubernetes-nginx'

const app = new cdk.App();
const account = '863541036173';
const region = 'us-east-2';
const version = 'auto';

const kubernetesIngressAddOn = new KubernetesIngressAddOn({
  crossZoneEnabled: true
});

/* // Configure external ingress
const externalIngressAddOn = new KubernetesIngressAddOn({
  name: "external-nginx-ingress",
  release: "external-k8s-ingress",
  ingressClassName: "external-nginx",
  controllerClass: "k8s.io/external-nginx",
  electionId: "external-ingress-controller-leader",
  crossZoneEnabled: true,
  internetFacing: true
});

// Configure internal ingress
const internalIngressAddOn = new KubernetesIngressAddOn({
  name: "internal-nginx-ingress",
  release: "internal-k8s-ingress",
  ingressClassName: "internal-nginx",
  controllerClass: "k8s.io/internal-nginx",
  electionId: "internal-ingress-controller-leader",
  crossZoneEnabled: true,
  internetFacing: false
}); */


const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.CalicoOperatorAddOn(),
    new blueprints.addons.MetricsServerAddOn(),
    new blueprints.addons.ClusterAutoScalerAddOn(),
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
    new blueprints.addons.CertManagerAddOn(),
    new blueprints.addons.AdotCollectorAddOn(),
    new blueprints.addons.FluxCDAddOn(),
    new blueprints.addons.ExternalsSecretsAddOn(),
    new blueprints.addons.XrayAddOn(),
    kubernetesIngressAddOn,
    // externalIngressAddOn,
    // internalIngressAddOn,
    // new blueprints.addons.NginxAddOn(),
    new blueprints.addons.KubeStateMetricsAddOn(),
    new blueprints.addons.PrometheusNodeExporterAddOn(),
    new blueprints.addons.AckAddOn({
        serviceName: AckServiceName.IAM, 
    }),
    new blueprints.addons.AckAddOn({
        id: "ec2-ack",
        createNamespace: false,
        serviceName: AckServiceName.EC2,
    }),
    new blueprints.addons.AckAddOn({
        id: "rds-ack",
        serviceName: AckServiceName.RDS,
        name: "rds-chart",
        chart: "rds-chart",
        version: "v0.1.1",
        release: "rds-chart",
        repository: "oci://public.ecr.aws/aws-controllers-k8s/rds-chart",
        managedPolicyName: "AmazonRDSFullAccess",
        createNamespace: false,
        saName: "rds-chart"
    }),
    new blueprints.addons.AckAddOn({
      serviceName: AckServiceName.EKS,
      createNamespace: false,
    }),
    new blueprints.addons.AckAddOn({
      id: "s3-ack",
      serviceName: AckServiceName.S3,
      name: "s3-chart",
      chart: "s3-chart",
      version: "v0.1.1",
      release: "s3-chart",
      repository: "oci://public.ecr.aws/aws-controllers-k8s/s3-chart",
      inlinePolicyStatements: [
        iam.PolicyStatement.fromJson({
          "Sid": "S3AllPermission",
          "Effect": "Allow",
          "Action": [
            "s3:*",
            "s3-object-lambda:*"
          ],
          "Resource": "*"
        }),
        iam.PolicyStatement.fromJson({
          "Sid": "S3ReplicationPassRole",
          "Condition": {
            "StringEquals": {
              "iam:PassedToService": "s3.amazonaws.com"
            }
          },
          "Action": "iam:PassRole",
          "Resource": "*",
          "Effect": "Allow"
        })
      ],
      createNamespace: false,
      saName: "s3-chart"
    }),
];

const stack = blueprints.EksBlueprint.builder()
    .account(account)
    .region(region)
    .version(version)
    .addOns(...addOns)
    .build(app, 'eks-blueprint');
