import { Construct } from "@aws-cdk/core";
import { KubernetesVersion } from '@aws-cdk/aws-eks';

/**
 * Looks up default value from context (cdk.json, cdk.context.json and ~/.cdk.json)
 * @param construct 
 * @param key 
 * @param defaultValue 
 * @returns 
 */
export function valueFromContext(construct: Construct, key: string, defaultValue: any) {
    return construct.node.tryGetContext(key) ?? defaultValue;
}

export function kubernetesVersionContext(construct: Construct) {
    const kubernetes_version = "kubernetes_version";
    let eks_context = construct.node.tryGetContext(kubernetes_version);
    let eks_version;
    if (eks_context.trim() != "") {
        eks_version = KubernetesVersion.V1_19;
    }
    else {
        if (eks_context.trim() == "V1_20")
            eks_version = KubernetesVersion.V1_20;
        else if (eks_context.trim()  == "V1_19")
            eks_version = KubernetesVersion.V1_19;
        else if (eks_context.trim() == "V1.18")
            eks_version = KubernetesVersion.V1_18;
        else if (eks_context.trim()  == "V1.17")
            eks_version = KubernetesVersion.V1_17;
        else
            throw "Invalid Kubernetes Version See: https://docs.aws.amazon.com/cdk/api/latest/python/aws_cdk.aws_eks/KubernetesVersion.html";
    }
    return eks_version;
}
export function kubernetesVersionDefault() {
    return  KubernetesVersion.V1_19;
}

