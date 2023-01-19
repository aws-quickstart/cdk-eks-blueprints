import { CsiSecretProps, LookupSecretsManagerSecretByName } from "..";

/**
 * Creates CsiSecretProps that contains secret template for ssh/username/pwd credentials.
 * In each case, the secret is expected to be a JSON structure containing url and either sshPrivateKey
 * or username and password attributes.
 * @param credentialsType SSH | USERNAME | TOKEN
 * @param secretName 
 * @returns 
 */
export function createSecretRef(credentialsType: string, secretName: string): CsiSecretProps {
    switch (credentialsType) {
        case "SSH":
            return createSshSecretRef(secretName);
        case "USERNAME":
        case "TOKEN":
            return createUserNameSecretRef(secretName);
        default:
            throw new Error(`credentials type ${credentialsType} is not supported by ArgoCD add-on.`);
    }
}

/**
 * Local function to create a secret reference for SSH key.
 * @param url 
 * @param secretName 
 * @returns 
 */
export function createSshSecretRef(secretName: string): CsiSecretProps {
    return {
        secretProvider: new LookupSecretsManagerSecretByName(secretName),
        jmesPath: [{ path: "url", objectAlias: "url" }, { path: "sshPrivateKey", objectAlias: "sshPrivateKey" }],
        kubernetesSecret: {
            secretName: secretName,
            labels: { "argocd.argoproj.io/secret-type": "repo-creds" },
            data: [
                { key: "url", objectName: "url" },
                { key: "sshPrivateKey", objectName: "sshPrivateKey" }
            ]
        }
    };
}

/**
 * Local function to a secret reference for username/pwd or username/token key.
 * @param url 
 * @param secretName 
 * @returns 
 */
export function createUserNameSecretRef(secretName: string): CsiSecretProps {
    return {
        secretProvider: new LookupSecretsManagerSecretByName(secretName),
        jmesPath: [{ path: "url", objectAlias: "url" }, { path: "username", objectAlias: "username" }, { path: "password", objectAlias: "password" }],
        kubernetesSecret: {
            secretName: secretName,
            labels: {"argocd.argoproj.io/secret-type": "repo-creds"},
            data: [
                { key: "url", objectName: "url" },
                { key: "username", objectName: "username" },
                { key: "password", objectName: "password" }
            ]
        }
    };
}
