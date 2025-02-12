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
     * Create Namespace with the provided one (will not if namespace is kube-system)
     */
    createNamespace?: boolean
}

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnUserProps & S3CSIDriverAddOnProps = {
  chart: S3_CSI_DRIVER,
  name: S3_CSI_DRIVER,
  namespace: "kube-system",
  release: S3_CSI_DRIVER_RELEASE,
  version: "v1.11.0",
  repository: "https://awslabs.github.io/mountpoint-s3-csi-driver",
  createNamespace: false,
  bucketNames: []
};

@supportsALL
export class S3CSIDriverAddOn extends HelmAddOn {

    readonly options: S3CSIDriverAddOnProps;

    constructor(props: S3CSIDriverAddOnProps) {
        super({ ...defaultProps as any, ...props });
        this.options = this.props as S3CSIDriverAddOnProps;
    }

    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        // Create service account and policy
        const cluster = clusterInfo.cluster;
        const serviceAccount = cluster.addServiceAccount(S3_CSI_DRIVER_SA, {
            name: S3_CSI_DRIVER_SA,
            namespace: this.options.namespace,
        });

        const s3BucketPolicy = new iam.Policy(cluster, S3_DRIVER_POLICY, {
            statements:
                getS3DriverPolicyStatements(this.options.bucketNames)
        });
        serviceAccount.role.attachInlinePolicy(s3BucketPolicy);
        
        // Create namespace
        if (this.options.createNamespace) {
            const ns = createNamespace(this.options.namespace!, cluster, true);
            serviceAccount.node.addDependency(ns);
        }

        // setup value for helm chart
        const chartValues = populateValues(this.options);

        const s3CsiDriverChart = this.addHelmChart(clusterInfo, chartValues, true, true);
        s3CsiDriverChart.node.addDependency(serviceAccount);
        return Promise.resolve(s3CsiDriverChart);
    }
}

function populateValues(helmOptions: S3CSIDriverAddOnProps): any {
    const values = helmOptions.values ?? {};
    setPath(values, 'node.serviceAccount.create', false);
    setPath(values, 'node.tolerateAllTaints', true);
    return values;
}
