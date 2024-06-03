import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';

const app = new cdk.App();
const account = '211125664433';
const region = 'us-east-2';
const myDomainName = "pjv.people.aws.dev";

// Create the stack
const stack = new cdk.Stack(app, 'EksBlueprintStack', {
    env: {
        account: account,
        region: region,
    }
});

// Lookup the hosted zone by domain name
const hostedZone = cdk.aws_route53.HostedZone.fromLookup(stack, 'HostedZoneLookup', {
    domainName: myDomainName,
});

const addOns: Array<blueprints.ClusterAddOn> = [
    new blueprints.addons.AwsLoadBalancerControllerAddOn(),
    new blueprints.addons.ExternalDnsAddOn({
        hostedZoneResources: [blueprints.GlobalResources.HostedZone]
    }),
    new blueprints.addons.KubernetesIngressAddOn({
        crossZoneEnabled: true,
        internetFacing: true,
        targetType: 'ip',
        externalDnsHostname: myDomainName,
        certificateResourceName: blueprints.GlobalResources.Certificate
    }),
    new blueprints.addons.CalicoOperatorAddOn(),
    new blueprints.addons.VpcCniAddOn(),
    new blueprints.addons.CoreDnsAddOn(),
    new blueprints.addons.KubeProxyAddOn(),
    new blueprints.addons.CertManagerAddOn(),
    new blueprints.addons.ExternalsSecretsAddOn()
];

blueprints.EksBlueprint.builder()
    .resourceProvider(blueprints.GlobalResources.HostedZone, new blueprints.ImportHostedZoneProvider(hostedZone.hostedZoneId))
    .resourceProvider(blueprints.GlobalResources.Certificate, new blueprints.CreateCertificateProvider('DomainWildcardCert', `*.${myDomainName}`, blueprints.GlobalResources.HostedZone)) // referencing hosted zone for automatic DNS validation
    .account(account)
    .region(region)
    .version("auto")
    .addOns(...addOns)
    .build(stack, 'EksBlueprintStack');
