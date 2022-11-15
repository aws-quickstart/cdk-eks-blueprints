import * as assert from "assert";
import { Construct } from "constructs";
import { ClusterInfo } from '../../spi';
import { createNamespace, dependable, setPath } from '../../utils';
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';

import * as cdk from 'aws-cdk-lib';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import * as semver from 'semver';

/**
 * Configuration options for the add-on.
 */
export interface JupyterHubAddOnProps extends HelmAddOnUserProps {

    /**
     * Configurations necessary to use EBS as Persistent Volume
     * @property {string} storageClass - storage class for the volume
     * @property {string} capacity - storage capacity (in Mi or Gi)
     */
    ebsConfig?: {
        storageClass: string,
        capacity: string,
    }

    /**
     * Configuration necessary to use EFS as Persistent Volume
     * @property {cdk.RemovalPolicy} removalPolicy - Removal Policy for EFS (DESTROY, RETAIN or SNAPSHOT)
     * @property {string} pvcName - Name of the Volume to be used for PV and PVC
     * @property {string} capacity - Storage Capacity (in Mi or Gi)
     */
    efsConfig?: {
        removalPolicy: cdk.RemovalPolicy,
        pvcName: string,
        capacity: string,
    }

    /**
     * Configuration settings for OpenID Connect authentication protocol
     */
    oidcConfig?: {
        callbackUrl: string,
        authUrl: string,
        tokenUrl: string,
        userDataUrl: string,
        clientId: string,
        clientSecret: string,
        scope: string[],
        usernameKey: string,
    }

    /**
     * Flag to use Ingress instead of LoadBalancer to expose JupyterHub
     * @property {boolean} enableIngress - This will enable ALB and will require Load Balancer Controller add-on
     */
    enableIngress?: boolean,

    /**
     * Notebook stack as defined using Docker Stacks for Jupyter here:
     * https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html#core-stacks
     */
    notebookStack?: string,
}

const JUPYTERHUB = 'jupyterhub';
const RELEASE = 'blueprints-addon-jupyterhub';

/**
 * Defaults options for the add-on
 */
const defaultProps: HelmAddOnProps = {
    name: JUPYTERHUB,
    namespace: JUPYTERHUB,
    version: '2.0.0',
    chart: JUPYTERHUB,
    release: RELEASE,
    repository: 'https://jupyterhub.github.io/helm-chart/',
    values: {}
};

/**
 * Implementation of the JupyterHub add-on
 */
export class JupyterHubAddOn extends HelmAddOn {

    readonly options: JupyterHubAddOnProps;

    constructor(props?: JupyterHubAddOnProps) {
        super({...defaultProps, ...props});
        this.options = this.props as JupyterHubAddOnProps;
    }

    @dependable('EbsCsiDriverAddOn' || 'EfsCsiDriverAddOn')
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values = this.options.values ?? {};

        // The addon requires a persistent storage option
        assert(this.options.ebsConfig || this.options.efsConfig, "You need to provide a persistent storage option.");
        
        // But you can only provide one option for persistent storage
        assert((!this.options.ebsConfig && this.options.efsConfig) || (this.options.ebsConfig && !this.options.efsConfig), 
            "You cannot provide more than one persistent storage option."
        );

        // Create Namespace
        const ns = createNamespace(this.options.namespace!, cluster, true, true);
        
        // User Environment setup
        let cmd;
        if (semver.lt(this.options.version!, '2.0.0')){
            cmd = ["start-singleuser.sh"];
        } else {
            cmd = ["jupyterhub-singleuser","--allow-root"];
        }
        const notebook = this.options.notebookStack || 'jupyter/base-notebook';
        setPath(values, "singleuser", {
            "image":{
                "name": `${notebook}`,
                "tag": "latest" 
            },
            "extraEnv": { "CHOWN_HOME": "yes" },
            "uid": 0,
            "fsGid": 0,
            "cmd": cmd
        });

        // Persistent Storage Setup for EBS
        if (this.options.ebsConfig){
            // Create persistent storage with EBS
            const storageClass = this.options.ebsConfig.storageClass;
            const ebsCapacity = this.options.ebsConfig.capacity;
            setPath(values, "singleuser.storage", {
                "dynamic": { "storageClass": storageClass },
                "capacity": ebsCapacity
            });
        } 
        
        // Persistent Storage Setup for EFS
        if (this.options.efsConfig) {
            const pvcName = this.options.efsConfig.pvcName;
            const removalPolicy = this.options.efsConfig.removalPolicy;
            const efsCapacity = this.options.efsConfig.capacity;

            this.setupEFS(clusterInfo, this.options.namespace!, pvcName, efsCapacity, removalPolicy);
            setPath(values, "singleuser.storage", {
                "type": "static",
                "static": {
                    "pvcName": `${pvcName}`,
                    "subPath": "home/{username}"
                }
            });
        }

        // OpenID Connect authentication setup
        if (this.options.oidcConfig){
            setPath(values, "hub.config.GenericOAuthenticator", {
                "client_id": this.options.oidcConfig.clientId,
                "client_secret": this.options.oidcConfig.clientSecret,
                "oauth_callback_url": this.options.oidcConfig.callbackUrl,
                "authorize_url": this.options.oidcConfig.authUrl,
                "token_url": this.options.oidcConfig.tokenUrl,
                "userdata_url": this.options.oidcConfig.userDataUrl,
                scope:  this.options.oidcConfig.scope,
                username_key:  this.options.oidcConfig.usernameKey,
            });
            setPath(values, "hub.config.JupyterHub.authenticator_class", "generic-oauth");
        }

        // Ingress instead of LoadBalancer service to expose the proxy - leverages AWS ALB
        // If not, then it will leverage AWS NLB
        const enableIngress = this.options.enableIngress || false;
        setPath(values, "ingress.enabled", enableIngress);

        if (enableIngress){
            setPath(values, "ingress.annotations", 
                {
                    "kubernetes.io/ingress.class": "alb",
                    "alb.ingress.kubernetes.io/scheme": "internet-facing",
                    "alb.ingress.kubernetes.io/target-type": "ip",
                }
            );
            setPath(values, "proxy.service.type", "NodePort");
        } else {
            setPath(values, "proxy.service.annotations",
                {
                    "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
                    "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
                    "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip",
                }
            );
        }

        // Create Helm Chart
        const jupyterHubChart = this.addHelmChart(clusterInfo, values, false, true);

        // Add dependency
        jupyterHubChart.node.addDependency(ns);
        return Promise.resolve(jupyterHubChart);
    }

    /**
     * This is a helper function to use EFS as persistent storage
     * including necessary security group with ingress rule,
     * EFS File System, Kubernetes PV and PVC
     * @param {ClusterInfo} clusterInfo - Cluster Info
     * @param {string} namespace - Namespace
     * @param {string} pvcName - Name of the PV and PVC
     * @param {RemovalPolicy}removalPolicy - Removal Policy for EFS File System (RETAIN, DESTROY or SNAPSHOT)
     * @returns
     * */
    protected setupEFS(clusterInfo: ClusterInfo, namespace: string, pvcName: string, capacity: string, removalPolicy: cdk.RemovalPolicy){
        const cluster = clusterInfo.cluster;
        const clusterVpcCidr = clusterInfo.cluster.vpc.vpcCidrBlock;

        // Security Group required for access to the File System
        // With the right ingress rule
        const jupyterHubSG = new ec2.SecurityGroup(
            cluster.stack, 'MyEfsSecurityGroup',
            {
                vpc: clusterInfo.cluster.vpc,
                securityGroupName: "EksBlueprintsJHubEFSSG",
            }
        );
        jupyterHubSG.addIngressRule(
            ec2.Peer.ipv4(clusterVpcCidr),
            new ec2.Port({
                protocol: ec2.Protocol.TCP,
                stringRepresentation: "EFSconnection",
                toPort: 2049,
                fromPort: 2049,
            }),
        );

        // Create the EFS File System
        const jupyterHubFileSystem = new efs.FileSystem(
            cluster.stack, 'MyEfsFileSystem', 
            {
                vpc: clusterInfo.cluster.vpc,
                securityGroup: jupyterHubSG,
                removalPolicy: removalPolicy,
            }
        );
        const efsId = jupyterHubFileSystem.fileSystemId;
        
        // Create StorageClass
        const efsSC = cluster.addManifest('efs-storage-class', {
            apiVersion: 'storage.k8s.io/v1',
            kind: 'StorageClass',
            metadata: {
                name: 'efs-sc',
            },
            provisioner: 'efs.csi.aws.com',
        });

        // Setup PersistentVolume and PersistentVolumeClaim
        const efsPV = cluster.addManifest('efs-pv', {
            apiVersion: 'v1',
            kind: 'PersistentVolume',
            metadata: { 
                name: `${pvcName}`,
                namespace: namespace
            },
            spec: {
                capacity: { storage: `${capacity}` },
                volumeMode: 'Filesystem',
                accessModes: [ 'ReadWriteMany' ],
                storageClassName: 'efs-sc',
                csi: {
                    driver: 'efs.csi.aws.com',
                    volumeHandle: `${efsId}`,
                }
            },
        });
        efsPV.node.addDependency(efsSC);
        efsPV.node.addDependency(jupyterHubFileSystem);

        const efsPVC = cluster.addManifest('efs-pvc', {
            apiVersion: 'v1',
            kind: 'PersistentVolumeClaim',
            metadata: { 
                name: `${pvcName}`,
                namespace: namespace
            },
            spec: {
                storageClassName: 'efs-sc',
                accessModes: [ 'ReadWriteMany' ],
                resources: { requests: { storage: `${capacity}` } },
            },
        });
        efsPVC.node.addDependency(efsPV);
    }
}

