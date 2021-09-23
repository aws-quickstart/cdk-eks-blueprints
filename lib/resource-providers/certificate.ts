import * as spi from '../spi';
import * as acm from '@aws-cdk/aws-certificatemanager';
import { IHostedZone } from '@aws-cdk/aws-route53';

/**
 * Certificate provider that imports certificate into the current stack by arn. 
 */
export class ImportCertificateProvider implements spi.ResourceProvider<acm.ICertificate> {

    constructor(private readonly certificateArn: string, private readonly id: string) {}

    provide(context: spi.ResourceContext) : acm.ICertificate {
        return acm.Certificate.fromCertificateArn(context.scope, this.id, this.certificateArn);
    }
}

/**
 * Certificate provider that creates a new certificate. 
 * Expects a hosted zone to be registed for validation. 
 */
export class CreateCertificateProvider implements spi.ResourceProvider<acm.ICertificate> {

    /**
     * Creates the certificate provider.
     * @param name Name of this resource that other resource providers, add-ons and teams can use for look-up.
     * @param domainName 
     * @param hostedZoneResourceName 
     */
    constructor(readonly name : string, readonly domainName: string, readonly hostedZoneResourceName: string) {}

    provide(context: spi.ResourceContext) : acm.ICertificate {
        const hostedZone = context.get<IHostedZone>(this.hostedZoneResourceName);

        return new acm.Certificate(context.scope, this.name, {
            domainName: this.domainName,
            validation: acm.CertificateValidation.fromDns(hostedZone),
          });       
    }
}