import * as acm from '@aws-cdk/aws-certificatemanager';
import { Certificate } from '@aws-cdk/aws-certificatemanager';
import { ClusterInfo } from '../../spi';

export interface CertificateProvider {

    /**
     * Abstracts the way how ACM certificate is obtained. It can be created, imported, shared through stacks.
     * @param clusterInfo EKS cluster info and reference to the stack
     */
    provide(clusterInfo : ClusterInfo) : acm.ICertificate;
}

export class ImportCertificateProvider implements CertificateProvider {

    constructor(private readonly certificateArn: string) {}

    provide(clusterInfo: ClusterInfo) : acm.ICertificate {
        return Certificate.fromCertificateArn(clusterInfo.cluster.stack, 'Certificate', this.certificateArn);
    }
}

export class CreateCertificateProvider implements CertificateProvider {

    provide(clusterInfo: ClusterInfo) : acm.ICertificate {
        return new acm.Certificate(clusterInfo.cluster.stack, 'Certificate', {
            domainName: 'hello.example.com',
            validation: acm.CertificateValidation.fromDns(),
          });
    }

}