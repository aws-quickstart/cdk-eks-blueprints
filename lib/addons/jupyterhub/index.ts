import * as assert from "assert";
import { Construct } from "constructs";
import { ClusterInfo } from '../../spi';
import { createNamespace, setPath } from '../../utils';
import { AwsLoadBalancerControllerAddOn } from "../aws-loadbalancer-controller";
import { HelmAddOn, HelmAddOnProps, HelmAddOnUserProps } from '../helm-addon';

import * as cdk from 'aws-cdk-lib';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';

import * as semver from 'semver';
import { EbsCsiDriverAddOn } from "../ebs-csi-driver";
import { EfsCsiDriverAddOn } from "../efs-csi-driver";

/**
 * Configuration options for exposing the JupyterHub proxy
 */
export enum JupyterHubServiceType {
    /**
     * Expose the service using AWS Application Load Balancer + Ingress controller
     */
    ALB,

    /**
     * Expose the service using AWS Network Load Balancer + LoadBalancer service
     */
    NLB,
    
    /**
     * Use ClusterIP service type and allow customers to port-forward for localhost access
     */
    CLUSTERIP,
}

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
        scope?: string[],
        usernameKey?: string,
    }

    /**
     * Configuration to set how the hub service will be exposed
     * See enum jupyterHubService for choices
     */
    serviceType: JupyterHubServiceType,

    /**
     * Ingress host - only if Ingress is enabled
     * It is a list of available hosts to be routed upon request
     */
    ingressHosts?: string[],

    /**
     * Ingress annotations - only apply if Ingress is enabled, otherwise throws an error
     */
    ingressAnnotations?: {
        [key: string]: string
    }

    /**
     * Notebook stack as defined using Docker Stacks for Jupyter here:
     * https://jupyter-docker-stacks.readthedocs.io/en/latest/using/selecting.html#core-stacks
     */
    notebookStack?: string,

    /**
     * Name of the certificate {@link NamedResourceProvider} to be used for certificate look up. 
     * @see {@link ImportCertificateProvider} and {@link CreateCertificateProvider} for examples of certificate providers.
     */
    certificateResourceName?: string,
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
    
    deploy(clusterInfo: ClusterInfo): Promise<Construct> {
        const cluster = clusterInfo.cluster;
        let values = this.options.values ?? {};

        // The addon requires a persistent storage option
        assert(this.options.ebsConfig || this.options.efsConfig, "You need to provide a persistent storage option.");
        
        // But you can only provide one option for persistent storage
        assert(!(this.options.ebsConfig && this.options.efsConfig), "You cannot provide more than one persistent storage option.");

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
            this.addEbsStorage(clusterInfo, values, this.options.ebsConfig);
        } 
        
        // Persistent Storage Setup for EFS
        if (this.options.efsConfig) {
            this.addEfsStorage(clusterInfo, values, this.options.efsConfig);
        }

        // OpenID Connect authentication setup
        if (this.options.oidcConfig){
            setPath(values, "hub.config", {
                "JupyterHub": { "authenticator_class": "generic-oauth" }, 
                "GenericOAuthenticator": {
                    "client_id": this.options.oidcConfig.clientId,
                    "client_secret": this.options.oidcConfig.clientSecret,
                    "oauth_callback_url": this.options.oidcConfig.callbackUrl,
                    "authorize_url": this.options.oidcConfig.authUrl,
                    "token_url": this.options.oidcConfig.tokenUrl,
                    "userdata_url": this.options.oidcConfig.userDataUrl,
                    "scope":  this.options.oidcConfig.scope,
                    "username_key":  this.options.oidcConfig.usernameKey,
                }
            });
        }

        // Proxy information - set either ALB, NLB (default) or ClusterIP service based on 
        // provided configuration
        const serviceType = this.options.serviceType;
        const ingressHosts = this.options.ingressHosts || [];
        const ingressAnnotations = this.options.ingressAnnotations;
        const cert = this.options.certificateResourceName;

        const albAddOnCheck = clusterInfo.getScheduledAddOn('AwsLoadBalancerControllerAddOn.name');
        // Use Ingress and AWS ALB
        if (serviceType == JupyterHubServiceType.ALB){
            assert(albAddOnCheck, `Missing a dependency: ${AwsLoadBalancerControllerAddOn.name}. Please add it to your list of addons.`); 
            const presetAnnotations: any = {
                'alb.ingress.kubernetes.io/scheme': 'internet-facing',
                'alb.ingress.kubernetes.io/target-type': 'ip',
                'kubernetes.io/ingress.class': 'alb',
            };
            if (cert){
                presetAnnotations['alb.ingress.kubernetes.io/ssl-redirect'] = '443';
                presetAnnotations['alb.ingress.kubernetes.io/listen-ports'] = '[{"HTTP": 80},{"HTTPS":443}]';
                const certificate = clusterInfo.getResource<ICertificate>(cert);
                presetAnnotations['alb.ingress.kubernetes.io/certificate-arn'] = certificate?.certificateArn;
            } 
            const annotations = { ...ingressAnnotations, ...presetAnnotations};
            setPath(values, "ingress.annotations", annotations);
            setPath(values, "ingress.hosts", ingressHosts);
            setPath(values, "ingress.enabled", true);
            setPath(values, "proxy.service", {"type" : "ClusterIP"});
        } else {
            assert(!ingressHosts || ingressHosts.length == 0, 'Ingress Hosts CANNOT be assigned when ingress is disabled');
            assert(!ingressAnnotations, 'Ingress annotations CANNOT be assigned when ingress is disabled');
            assert(!cert, 'Cert option is only supported if ingress is enabled.');
            // If we set SVC, set the proxy service type to ClusterIP and allow users to port-forward to localhost
            if (serviceType == JupyterHubServiceType.CLUSTERIP){
                setPath(values, "proxy.service", {"type": "ClusterIP"});
            // We will use NLB 
            } else {
                assert(albAddOnCheck, `Missing a dependency: ${AwsLoadBalancerControllerAddOn.name}. Please add it to your list of addons.`); 
                setPath(values, "proxy.service", { 
                    "annotations": {
                        "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
                        "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
                        "service.beta.kubernetes.io/aws-load-balancer-nlb-target-type": "ip",
                    }
                });
            }
        }

        // Create Helm Chart
        const jupyterHubChart = this.addHelmChart(clusterInfo, values, false, false);

        // Add dependency
        jupyterHubChart.node.addDependency(ns);
        return Promise.resolve(jupyterHubChart);
    }
    /**
     * This is a helper function to create EBS persistent storage
     * @param {ClusterInfo} clusterInfo - Cluster Info
     * @param {string} values - Helm Chart Values
     * @param {string} ebsConfig - EBS Configurations supplied by user
     * @returns
     */
    protected addEbsStorage(clusterInfo: ClusterInfo, values: any, ebsConfig: any){
        const dep = clusterInfo.getScheduledAddOn(EbsCsiDriverAddOn.name);
        assert(dep, `Missing a dependency: ${EbsCsiDriverAddOn.name}. Please add it to your list of addons.`); 
        // Create persistent storage with EBS
        const storageClass = ebsConfig.storageClass;
        const ebsCapacity = ebsConfig.capacity;
        setPath(values, "singleuser.storage", {
            "dynamic": { "storageClass": storageClass },
            "capacity": ebsCapacity
        });
    }

    /**
     * This is a helper function to create EFS persistent storage
     * @param {ClusterInfo} clusterInfo - Cluster Info
     * @param {string} values - Helm Chart Values
     * @param {string} efsConfig - EFS Configurations supplied by user
     * @returns
     */
    protected addEfsStorage(clusterInfo: ClusterInfo, values: any, efsConfig: any){
        const dep = clusterInfo.getScheduledAddOn(EfsCsiDriverAddOn.name);
        assert(dep, `Missing a dependency: ${EfsCsiDriverAddOn.name}. Please add it to your list of addons.`); 

        const pvcName = efsConfig.pvcName;
        const removalPolicy = efsConfig.removalPolicy;
        const efsCapacity = efsConfig.capacity;

        this.setupEFS(clusterInfo, this.options.namespace!, pvcName, efsCapacity, removalPolicy);
        setPath(values, "singleuser.storage", {
            "type": "static",
            "static": {
                "pvcName": `${pvcName}`,
                "subPath": "home/{username}"
            }
        });
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

