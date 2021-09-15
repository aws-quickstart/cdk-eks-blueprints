import * as spi from '../spi';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { IHostedZone } from '@aws-cdk/aws-route53';

export class ImportCertificateProvider implements spi.NamedResourceProvider<acm.ICertificate> {

    constructor(private readonly certificateArn: string, private readonly id: string) {}

    provide(context: spi.ResourceContext) : spi.NamedResource<acm.ICertificate> {
        const cert = acm.Certificate.fromCertificateArn(context.scope, this.id, this.certificateArn);
        return  {
            name: this.id, 
            type: spi.ResourceType.Certificate,
            resource: cert
        }
    }
}

/**
 * Certificate provider that creates a new certificate. 
 * Expects a hosted zone to be registed for validation. 
 */
export class CreateCertificateProvider implements spi.NamedResourceProvider<acm.ICertificate> {

    /**
     * Creates the certificate provider.
     * @param name Name of this resource that other resource providers, add-ons and teams can use for look-up.
     * @param domainName 
     * @param hostedZoneResourceName 
     */
    constructor(readonly name : string, readonly domainName: string, readonly hostedZoneResourceName: string) {}

    provide(context: spi.ResourceContext) : spi.NamedResource<acm.ICertificate> {
        const hostedZone = context.get<IHostedZone>(this.hostedZoneResourceName)!.resource;

        const cert = new acm.Certificate(context.scope, this.name, {
            domainName: this.domainName,
            validation: acm.CertificateValidation.fromDns(hostedZone),
          });
        
        return {
            name: this.name,
            type: spi.ResourceType.Certificate,
            resource: cert
        }
    }
}