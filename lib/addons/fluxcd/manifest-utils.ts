import { FluxCDAddOnProps, FluxCDAddOn } from "./index"
import * as spi from "../..";
/**
 * Creates  secret template for username/pwd credentials.
 * In each case, the secret is expected to be a JSON structure username and password attributes.
 * @param credentialsType SSH | USERNAME | TOKEN
 * @param secretName 
 * @returns 
 */
export function createSecretObject(secretValue: string, fluxRepo: spi.FluxCDRepository): Record<string, any> {
    switch (fluxRepo?.credentialsType) {
        // case "SSH": //not implemented yet
        //     return createSshSecretRef(secretName);
        case "USERNAME":
        case "TOKEN":
            return createUserNameSecret(secretValue, fluxRepo);

        default:
            throw new Error(`credentials type ${fluxRepo?.credentialsType} is not supported by FluxCD add-on.`);
    }
}


/**
 * Local function to return a kubernetes manifest secret object for username/pwd or username/token key.
 * @param secretValue 
 * @param fluxRepo 
 * @returns Record<string, any>
 */
export function createUserNameSecret(secretValue: string, fluxRepo: spi.FluxCDRepository): Record<string, any> {
    let secretUsername =''
    let secretPassword =''
    
    secretUsername = JSON.parse(secretValue)['username'];
    secretPassword = JSON.parse(secretValue)['password'];

    return {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: {
            name: fluxRepo?.credentialsSecretName,
            namespace: 'flux-system'
        },
        type: 'Opaque',
        data: {
            username: secretUsername,
            password: secretPassword,
        }
    }
}

