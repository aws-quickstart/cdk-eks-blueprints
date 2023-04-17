export interface BackstageProps {
    annotations?: {
        [key: string]: string
    },

    appConfig?: {
        [key: string]: string
    },

    args?: string[],

    command?: string[],

    containerPorts?: {
        [key: string]: string
    },

    containerSecurityContext?: any,

    extraAppConfig?: string[],
    extraContainers?: string[],
    extraEnvVars?: string[],
    extraEnvVarsSecrets?: string[],
    extraVolumes?: string[],

    image: {
        debug?: boolean,
        pullPolicy?: string,
        pullSecrets?: string[],
        registry: string,
        repository: string,
        tag: string
    }

    initContainers?: string[],
    installDir?: string,

    nodeSelector?: {
        [key: string]: string
    },

    podAnnotations?: {
        [key: string]: string
    },

    podSecurityContext?: {
        [key: string]: string
    },

    replicas?: number,

    resources?: {
        [key: string]: string
    },

    tolerations?: string[]
}

export interface DiagnosticProps {
    args?: string[],
    command?: string[],
    enabled?: boolean,
}

export interface GlobalProps {
    imagePullSecrets?: string[],
    imageRegistry?: string,
}

export interface IngressProps {
    annotations?: {
        [key: string]: string
    },

    className?: string,
    enabled?: boolean,
    host?: string,

    tls?: {
        enabled: boolean,
        secretName: string,
    }
}

export interface MetricsProps {
    serviceMonitor?: {
        annotations?: {
            [key: string]: string
        },

        enabled?: boolean,
        interval?: string,

        labels?: {
            [key: string]: string
        },

        path?: string,
    }
}

export interface NetworkProps {
    egressRules?: {
        customRules?: string[],
    },

    enabled?: boolean,
}

export interface PostgresProps {
    architecture?: "standalone" | "replication",

    auth?: {
        existingSecret?: string,
        password?: string,

        secretKeys?: {
            adminPasswordKey?: string,
            replicationPasswordKey?: string,
            userPasswordKey?: string
        },

        username?: string,
    }

    enabled?: boolean
}

export interface ServiceProps {
    annotations?: {
        [key: string]: string
    },

    clusterIp?: string,
    externalTrafficPolicy?: string,
    extraPorts?: string[],
    loadBalancerIp?: string,
    loadBalancerSourceRanges?: string[],

    nodePorts?: {
        [key: string]: string
    },

    ports?: {
        name: string,
        targetPort: string,
        sessionAffinity?: string,
    },

    type: string
}

export interface ServiceAccountProps {
    annotations?: {
        [key: string]: string
    },

    automountServiceAccountToken?: boolean,
    create?: boolean,

    labels?: {
        [key: string]: string
    },

    name?: string,
}