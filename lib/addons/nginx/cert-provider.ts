import * as acm from '@aws-cdk/aws-certificatemanager';
import { ClusterInfo } from '../../spi';

export interface CertificateProvider {

    /**
     * Abstracts the way how ACM certificate is obtained. It can be created, imported, shared through stacks.
     * @param clusterInfo EKS cluster info and reference to the stack
     */
    provide(clusterInfo : ClusterInfo) : acm.Certificate;
}

