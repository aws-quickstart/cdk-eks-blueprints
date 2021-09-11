import { ClusterAddOn, ClusterInfo } from "../../spi";
import { Constants } from "..";
import { Cluster } from "@aws-cdk/aws-eks";

/**
 * Configuration options for the add-on.
 */
export interface VeleroAddOnProps {
    /**
     * Velero for the Velero Helm Chart.
     * @default 2.23.6
     */
    version?: string;

    /**
     * Namespace for the add-on.
     * @default velero
     */
    namespace?: string;

    /**
     * Init containers to add to the Velero deployment's pod spec. At least one plugin provider image is required.
     * @default aws
     */
    initContainers?: Array<any>;  

     /**
     * Values to pass to the chart as per https://github.com/vmware-tanzu/helm-charts/blob/main/charts/velero/values.yaml#
     */
    values: {
        [key: string]: any;
    };

}

/**
 * Defaults options for the add-on
 */
const defaultProps: VeleroAddOnProps = {
    version: "2.23.6",
    namespace: "velero",
    initContainers:[
        {
            name: "velero-plugin-for-aws",
            image: "velero/velero-plugin-for-aws:v1.2.0",
            imagePullPolicy: "IfNotPresent",
            volumeMounts:[
                {
                    mountPath: "/target",
                    name: "plugins"
                }
            ]
        }
    ],
    values:{
        configuration: {
            provider: "aws",
            backupStorageLocation:{
                name: "velero-backup",
                bucket: "velero-backup-bucket",
            },
            volumeSnapshotLocation:{
                name: "velero-backup-snapshots"
            }
        }
        //"configuration.provider": "aws",
        //["configuration.backupStorageLocation.provider"]: "aws",
        //["configuration.backupStorageLocation.name"]: "velero-backup",
        //["configuration.backupStorageLocation.bucket"]: "velero-backup-bucket",
        //["configuration.volumeSnapshotLocation.provider"]: "aws",
        //["configuration.volumeSnapshotLocation.name"]: "velero-backup-snapshots",
    },

};

export class VeleroAddOn implements ClusterAddOn {

    private options: VeleroAddOnProps;
    constructor(props?: VeleroAddOnProps) {
        this.options = { ...defaultProps, ...props };
    }

    deploy(clusterInfo: ClusterInfo): void {

        const props = this.options;
        const regionVaraible:VeleroAddOnProps = {
            values: {
                configuration: {
                    backupStorageLocation: {
                        config:{
                            region: clusterInfo.cluster.stack.region
                        }
                    },
                    volumeSnapshotLocation:{
                        config:{
                            region: clusterInfo.cluster.stack.region
                        }
                    }
                }                
            }
        };
        const values = { ...props.values, ...regionVaraible } ?? {};

        clusterInfo.cluster.addHelmChart("velero-addon", {
            chart: "velero",
            repository: "https://vmware-tanzu.github.io/helm-charts/",
            release: Constants.SSP_ADDON,
            namespace: props.namespace,
            version: props.version,
            values
        });
    }
}