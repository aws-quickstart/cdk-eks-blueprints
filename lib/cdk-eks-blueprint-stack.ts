
import * as cdk from '@aws-cdk/core';
import * as eks from "@aws-cdk/aws-eks";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as iam from "@aws-cdk/aws-iam";
import { clusterAutoScaling } from "./cluster-autoscaler-manifest"
import { Cluster, Nodegroup } from '@aws-cdk/aws-eks';
import { Stack } from '@aws-cdk/core';
import { TeamTroySetup } from './team-troy/setup';
import { TeamRikerSetup } from './team-riker/setup';
import { TeamBurnhamSetup } from './team-burnham/setup';
import { ManagedPolicy } from '@aws-cdk/aws-iam';
import { readYamlDocument, loadYaml, serializeYaml } from './utils/read-file';
import { setPriority } from 'os';

export class CdkEksBlueprintStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string) {
        super(scope, "eks-blueprint");

        const clusterName = "dev1";
        
        // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
        // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
        // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
        const vpc = new ec2.Vpc(this, clusterName + "-vpc");

        const cluster = new eks.Cluster(this, clusterName, {
            vpc: vpc,
            clusterName: clusterName,
            outputClusterName: true,
            defaultCapacity: 0, // we want to manage capacity ourselves
            version: eks.KubernetesVersion.V1_17,
        });


        const ng = cluster.addNodegroupCapacity(clusterName + "-ng", {
            instanceType: new ec2.InstanceType("t3.medium"),
            minSize: 1,
            maxSize: 4
        });

      //  this.cni(cluster);
        this.metricsServer(cluster);
        clusterAutoScaling(this, cluster, ng);
        this.cloudWatchContainerInsights(ng, cluster, this.region);
        this.nginxIngressController(cluster);
        this.argoCD(cluster);

        const teams: Array<TeamSetup> = [
          new TeamTroySetup(), 
          new TeamRikerSetup(), 
          new TeamBurnhamSetup()
        ];
        teams.forEach(setup => setup.setup(cluster, this));
    }

    //cni(cluster: Cluster) {
    //     const stable = 'https://helm.cilium.io/';
    //     cluster.addHelmChart("cilium", {
    //         repository: stable,
    //         chart: 'cilium',
    //         release: 'cilium',
    //         values: {
    //             "global.eni": 'false',
    //             "global.tunnel": 'enabled'
    //         }
    //     });
    //}

    //TODO: move to cloudwatch dir
    cloudWatchContainerInsights(ng: Nodegroup, cluster: Cluster, region: string) {
        ng.role.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'));
        let doc = readYamlDocument('./lib/cloudwatch/cwagent-fluentd-quickstart.yaml');
        let docArray = doc.replace(/{{cluster_name}}/g, cluster.clusterName).replace(/{{region_name}}/g, region).split("---").map(e => loadYaml(e));
        new eks.KubernetesManifest(this, "cluster-insights", {
            cluster,
            manifest: docArray
        });
    }

    metricsServer(cluster: Cluster) {
        const stable = 'https://kubernetes-charts.storage.googleapis.com/';
        cluster.addHelmChart("metrics-server", {
            repository: stable,
            chart: 'metrics-server',
            release: 'metrics-server'
        });
    }

    nginxIngressController(cluster: Cluster) {
        cluster.addHelmChart("ngninx-ingress", {
            chart: "nginx-ingress",
            repository: "https://helm.nginx.com/stable",
            namespace: "kube-system"
        });
    }

    argoCD(cluster: Cluster) {
        const argons = cluster.addManifest('argocd', {
            apiVersion: 'v1',
            kind: 'Namespace',
            metadata: { name: 'argocd' }
        });
        let doc = readYamlDocument('./lib/argocd/install.yaml');
        let docArray = doc.split("---").map(e => loadYaml(e));
        new eks.KubernetesManifest(this, "argocd", {
            cluster,
            manifest: docArray
        });
    }
}



export interface TeamSetup {
    setup(cluster: Cluster, stack: Stack): void;
}
