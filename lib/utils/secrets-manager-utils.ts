import { SecretsManager } from "aws-sdk";
/**
 * Gets secret value from AWS Secret Manager. Requires access rights to the secret, specified by the secretName parameter.
 * @param secretName name of the secret to retrieve
 * @param region 
 * @returns 
*/
 export async function getSecretValue(secretName: string, region: string): Promise<string> {
    const secretManager = new SecretsManager({ region: region });
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