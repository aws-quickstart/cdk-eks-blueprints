#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };

const addOns = [
    new blueprints.addons.IstioBaseAddOn(),
    new blueprints.addons.KNativeOperator()
]


const clusterProvider = new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_21,
    managedNodeGroups: [
        {
            id: "mng1",
            amiType: NodegroupAmiType.AL2_X86_64,
            instanceTypes: [new ec2.InstanceType('m5.large')],
        },
    ]
});

blueprints.EksBlueprint.builder()
    .addOns(...addOns)
    .clusterProvider(clusterProvider)
    .build(app, 'knative-blueprint-test', props);
