import * as yaml from 'yaml';
/**
 * Local function to create a secret reference for SSH key.
 * @param url 
 * @param secretName 
 * @returns 
 */
 export const sshRepoRef = (url: string, secretName: string): string => yaml.stringify(
    [{
        url,
        sshPrivateKeySecret: {
            name: secretName,
            key: "sshPrivateKey"
        }
    }]
);

/**
 * Local function to a secret reference for username/pwd or username/token key.
 * @param url 
 * @param secretName 
 * @returns 
 */
export const userNameRepoRef = (url: string, secretName: string): string => yaml.stringify(
    [{
        url,
        usernameSecret: {
            name: secretName,
            key: "username"
        },
        passwordSecret: {
            name: secretName,
            key: "password"
        }
    }]
);