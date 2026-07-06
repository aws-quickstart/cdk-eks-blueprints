import { Construct } from "constructs";
import { ClusterInfo } from "../../spi";
import { HelmAddOn, HelmAddOnUserProps } from "../helm-addon";
import * as iam from 'aws-cdk-lib/aws-iam';
import { createNamespace, setPath, supportsALL } from "../../utils";
import { getS3DriverPolicyStatements } from "./iam-policy";

const S3_CSI_DRIVER_SA = 's3-csi-driver-sa';
const S3_CSI_DRIVER = "aws-mountpoint-s3-csi-driver";

const S3_CSI_DRIVER_RELEASE = 's3-csi-driver-release';
const S3_DRIVER_POLICY = 's3-csi-driver-policy';

/**
 * Configuration options for the add-on.
 */
export interface S3CSIDriverAddOnProps extends HelmAddOnUserProps {
    /**
     * The names of the S3 buckets to be used by the driver
     */
    bucketNames: string[];
    /**
     * The ARNs of KMS Keys to be used by the driver.  Required if you are using Customer Managed Keys for S3
     */
    kmsArns?: string[];
    /**
     * Create Namespace with the provided one (will not if namespace is kube-system)
     */
    createNamespace?: boolean;
}

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnUserProps & S3CSIDriverAddOnProps = {
  chart: S3_CSI_DRIVER,
  name: S3_CSI_DRIVER,
  namespace: "kube-system",
  release: S3_CSI_DRIVER_RELEASE,
  version: "2.7.0",
  repository: "https://awslabs.github.io/mountpoint-s3-csi-driver",
  createNamespace: false,
  bucketNames: [],
  kmsArns: []
};

@supportsALL
export class S3CSIDriverAddOn extends HelmAddOn {

    readonly options: S3CSIDriverAddOnProps;

    constructor(props: S3CSIDriverAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props as S3CSIDriverAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;

        // Create namespace
        if (this.options.createNamespace) {
            createNamespace(this.options.namespace!, cluster, true);
        }

        // Let Helm create the node SA with RBAC bindings
        const chartValues = populateValues(this.options);
        const s3CsiDriverChart = this.addHelmChart(clusterInfo, chartValues, true, true);

        // Overwrite the Helm-created SA with IRSA annotation (fires after chart)
        const serviceAccount = cluster.addServiceAccount(S3_CSI_DRIVER_SA, {
            name: S3_CSI_DRIVER_SA,
            namespace: this.options.namespace,
            overwriteServiceAccount: true
        });

        const s3BucketPolicy = new iam.Policy(cluster, S3_DRIVER_POLICY, {
            statements:
                getS3DriverPolicyStatements(this.options.bucketNames, this.options.kmsArns ?? [])
        });
        serviceAccount.role.attachInlinePolicy(s3BucketPolicy);

        serviceAccount.node.addDependency(s3CsiDriverChart);
        return Promise.resolve(s3CsiDriverChart);
    }
}

function populateValues(helmOptions: S3CSIDriverAddOnProps): any {
    const values = helmOptions.values ?? {};
    setPath(values, 'node.serviceAccount.create', true);
    setPath(values, 'controller.serviceAccount.create', true);
    setPath(values, 'node.tolerateAllTaints', true);
    return values;
}
