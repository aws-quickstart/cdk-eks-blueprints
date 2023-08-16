#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import BlueprintConstruct from '../examples/blueprint-construct';
import { EksBlueprint, FluxCDAddOn, GrafanaOperatorAddon, SSMAgentAddOn } from '../lib';

const app = new cdk.App();

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const props = { env: { account, region } };
const nginxDashUrl = "https://raw.githubusercontent.com/aws-observability/aws-observability-accelerator/main/artifacts/grafana-dashboards/eks/nginx/nginx.json"
const javaDashUrl = "https://raw.githubusercontent.com/aws-observability/aws-observability-accelerator/main/artifacts/grafana-dashboards/eks/java/default.json"

const fluxAddOn = new FluxCDAddOn({
    repositories:[{
            bootstrapRepo: {
                repoUrl: 'https://github.com/aws-observability/aws-observability-accelerator',
                name: "nginx-grafanadashboard",
                targetRevision: "main",
                path: "./artifacts/grafana-operator-manifests/eks/nginx",
            },
            bootstrapValues: {
                "GRAFANA_NGINX_DASH_URL" : nginxDashUrl,
                "GRAFANA_JAVA_JMX_DASH_URL": javaDashUrl,
            },
            additionalFluxKustomizationPaths: ["./artifacts/grafana-operator-manifests/eks/java"],
        },
        {
            bootstrapRepo: {
                repoUrl: 'https://github.com/stefanprodan/podinfo',
                name: "podinfo",
                targetRevision: "master",
                path: "./kustomize"
            },
            bootstrapValues: {"region":"us-west-2"},
            fluxTargetNamespace: "default",
        }],
});

EksBlueprint.builder()
    .version("auto")
    .addOns(
        new SSMAgentAddOn(),
        new GrafanaOperatorAddon(),
        fluxAddOn,
    )
    .withEnv(props.env).build(app, "test-flux");
