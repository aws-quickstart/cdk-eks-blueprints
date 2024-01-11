import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';

test("Kubeproxy Addon deploying correct default version of Addon for 1.28", async () => {
    const app = new cdk.App();

    await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_28)
        .addOns(new blueprints.KubeProxyAddOn("auto"))
        .build(app, "KubeProxy-stack-001");
});

test("Kubeproxy Addon deploying correct default version of Addon for 1.27", async () => {
    const app = new cdk.App();

    await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_27)
        .addOns(new blueprints.KubeProxyAddOn("auto"))
        .build(app, "KubeProxy-stack-002");
});

test("Kubeproxy Addon deploying correct default version of Addon for 1.26", async () => {
    const app = new cdk.App();

    await blueprints.EksBlueprint.builder()
        .account('123456789').region('us-west-2')
        .version(KubernetesVersion.V1_26)
        .addOns(new blueprints.KubeProxyAddOn("auto"))
        .build(app, "KubeProxy-stack-003");
});