import { SecretsManager } from "aws-sdk";
/**
 * Gets secret value from AWS Secret Manager. Requires access rights to the secret, specified by the secretName parameter.
 * @param secretName name of the secret to retrieve
 * @param region 
 * @returns 
*/
 export async function getSecretValue(secretName: string, region: string): Promise<string> {
    const secretManager = new SecretsManager({ region });
    let secretString = "";
    try {
        let response = await secretManager.getSecretValue({ SecretId: secretName }).promise();
        if (response) {
            if (response.SecretString) {
                secretString = response.SecretString;
            } else if (response.SecretBinary) {
                throw new Error(`Invalid secret format for ${secretName}. Expected string value, received binary.`);
            }
        }
        return secretString;
    }
    catch (error) {
        console.log(`error getting secret ${secretName}: `  + error);
        throw error;
    }
}

/**
 * Throws an error if secret is undefined in the target region.
 * @returns ARN of the secret if exists.
 */
export async function validateSecret(secretName: string, region: string): Promise<string> {
    const secretManager = new SecretsManager({ region });
    try {
        const response = await secretManager.describeSecret({ SecretId: secretName }).promise();
        return response.ARN!;
    }
    catch (error) {
        console.log(`Secret ${secretName} is not defined: `  + error);
        throw error;
    }
}