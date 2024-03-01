import * as cdk from "aws-cdk-lib";
import * as blueprints from "../lib";
import {
    ClusterAddOn,
    ClusterInfo,
    GenerateSecretManagerProvider,
    SecretProviderClass,
    SecretsStoreAddOn
} from "../lib";
import {ServiceAccount} from "aws-cdk-lib/aws-eks";

class TestSecretAddon implements ClusterAddOn {
    public deploy(clusterInfo: ClusterInfo): void {
        const sa = new ServiceAccount(clusterInfo.cluster.stack, "sa", {name: "acme-sa", cluster: clusterInfo.cluster});
        new SecretProviderClass(clusterInfo, sa, "acme-aws-secrets",
            {
                secretProvider: new GenerateSecretManagerProvider("acme-secret", "real-secret-name"),
                kubernetesSecret: {
                    secretName: "real-secret-name",
                    secretAlias: "aliased-secret-name",
                }
            }
        );
    }
}

describe('Unit tests for SecretProviderClass', () => {

    test("SecretProviderClass contains objectAlas when configured.", async () => {

        const app = new cdk.App();
        const stack = new blueprints.EksBlueprint(app, {
            id: 'MySecretTestStack',
            version: "auto",
            addOns: [
                new SecretsStoreAddOn(),
                new TestSecretAddon(),
            ],
            });

        const stackResolved = await stack.waitForAsyncTasks();
        const template = app.synth().getStackArtifact(stackResolved.artifactId).template;
        const stringTemplate = JSON.stringify(template);
        const expectedSubstring = "\\\\\\\"objectAlias\\\\\\\":\\\\\\\"aliased-secret-name\\\\\\";
        expect(stringTemplate).toContain(expectedSubstring);
    });
});