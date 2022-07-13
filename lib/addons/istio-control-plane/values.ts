export interface ValuesSchema {
  awsRegion?: string;
  pilot?: {
    autoscaleEnabled?: boolean
    autoscaleMin?: number
    autoscaleMax?: number
    replicaCount?: number
    rollingMaxSurge?: string
    rollingMaxUnavailable?: string
    hub?: string
    tag?: string
    image?: string
    traceSampling?: number
    resources?: {
      requests?: {
        cpu?: string
        memory?: string
        [k: string]: unknown
      }
      [k: string]: unknown
    }
    env?: {
      [k: string]: unknown
    }
    cpu?: {
      targetAverageUtilization?: number
      [k: string]: unknown
    }
    enableProtocolSniffingForOutbound?: boolean
    enableProtocolSniffingForInbound?: boolean
    nodeSelector?: {
      [k: string]: unknown
    }
    podAnnotations?: {
      [k: string]: unknown
    }
    serviceAnnotations?: {
      [k: string]: unknown
    }
    jwksResolverExtraRootCA?: string
    configSource?: {
      subscribedResources?: unknown[]
      [k: string]: unknown
    }
    plugins?: unknown[]
    keepaliveMaxServerConnectionAge?: string
    deploymentLabels?: {
      [k: string]: unknown
    }
    configMap?: boolean
    podLabels?: {
      [k: string]: unknown
    }
    [k: string]: unknown
  }
  sidecarInjectorWebhook?: {
    neverInjectSelector?: unknown[]
    alwaysInjectSelector?: unknown[]
    injectedAnnotations?: {
      [k: string]: unknown
    }
    enableNamespacesByDefault?: boolean
    objectSelector?: {
      enabled?: boolean
      autoInject?: boolean
      [k: string]: unknown
    }
    rewriteAppHTTPProbe?: boolean
    templates?: {
      [k: string]: unknown
    }
    defaultTemplates?: unknown[]
    [k: string]: unknown
  }
  istiodRemote?: {
    injectionURL?: string
    injectionPath?: string
    [k: string]: unknown
  }
  telemetry?: {
    enabled?: boolean
    v2?: {
      enabled?: boolean
      metadataExchange?: {
        wasmEnabled?: boolean
        [k: string]: unknown
      }
      prometheus?: {
        enabled?: boolean
        wasmEnabled?: boolean
        configOverride?: {
          gateway?: {
            [k: string]: unknown
          }
          inboundSidecar?: {
            [k: string]: unknown
          }
          outboundSidecar?: {
            [k: string]: unknown
          }
          [k: string]: unknown
        }
        [k: string]: unknown
      }
      stackdriver?: {
        enabled?: boolean
        logging?: boolean
        monitoring?: boolean
        topology?: boolean
        disableOutbound?: boolean
        configOverride?: {
          [k: string]: unknown
        }
        [k: string]: unknown
      }
      accessLogPolicy?: {
        enabled?: boolean
        logWindowDuration?: string
        [k: string]: unknown
      }
      [k: string]: unknown
    }
    [k: string]: unknown
  }
  revision?: string
  revisionTags?: unknown[]
  ownerName?: string
  meshConfig?: {
    enablePrometheusMerge?: boolean
    rootNamespace?: null
    trustDomain?: string
    [k: string]: unknown
  }
  global?: {
    istioNamespace?: string
    defaultPodDisruptionBudget?: {
      enabled?: boolean
      [k: string]: unknown
    }
    defaultResources?: {
      requests?: {
        cpu?: string
        [k: string]: unknown
      }
      [k: string]: unknown
    }
    hub?: string
    tag?: string
    imagePullPolicy?: string
    imagePullSecrets?: unknown[]
    istiod?: {
      enableAnalysis?: boolean
      [k: string]: unknown
    }
    logAsJson?: boolean
    logging?: {
      level?: string
      [k: string]: unknown
    }
    omitSidecarInjectorConfigMap?: boolean
    oneNamespace?: boolean
    operatorManageWebhooks?: boolean
    priorityClassName?: string
    proxy?: {
      image?: string
      autoInject?: string
      clusterDomain?: string
      componentLogLevel?: string
      enableCoreDump?: boolean
      excludeInboundPorts?: string
      includeInboundPorts?: string
      includeIPRanges?: string
      excludeIPRanges?: string
      includeOutboundPorts?: string
      excludeOutboundPorts?: string
      logLevel?: string
      privileged?: boolean
      readinessFailureThreshold?: number
      readinessInitialDelaySeconds?: number
      readinessPeriodSeconds?: number
      resources?: {
        requests?: {
          cpu?: string
          memory?: string
          [k: string]: unknown
        }
        limits?: {
          cpu?: string
          memory?: string
          [k: string]: unknown
        }
        [k: string]: unknown
      }
      statusPort?: number
      tracer?: string
      holdApplicationUntilProxyStarts?: boolean
      [k: string]: unknown
    }
    proxy_init?: {
      image?: string
      resources?: {
        limits?: {
          cpu?: string
          memory?: string
          [k: string]: unknown
        }
        requests?: {
          cpu?: string
          memory?: string
          [k: string]: unknown
        }
        [k: string]: unknown
      }
      [k: string]: unknown
    }
    remotePilotAddress?: string
    caAddress?: string
    externalIstiod?: boolean
    configCluster?: boolean
    jwtPolicy?: string
    meshID?: string
    meshNetworks?: {
      [k: string]: unknown
    }
    mountMtlsCerts?: boolean
    multiCluster?: {
      enabled?: boolean
      clusterName?: string
      [k: string]: unknown
    }
    network: string
    pilotCertProvider?: string
    sds?: {
      token?: {
        aud?: string
        [k: string]: unknown
      }
      [k: string]: unknown
    }
    sts?: {
      servicePort?: number
      [k: string]: unknown
    }
    tracer?: {
      datadog?: {
        address?: string
        [k: string]: unknown
      }
      lightstep?: {
        address?: string
        accessToken?: string
        [k: string]: unknown
      }
      stackdriver?: {
        debug?: boolean
        maxNumberOfMessageEvents?: number
        maxNumberOfAnnotations?: number
        maxNumberOfAttributes?: number
        [k: string]: unknown
      }
      zipkin?: {
        address?: string
        [k: string]: unknown
      }
      [k: string]: unknown
    }
    useMCP?: boolean
    caName?: string
    [k: string]: unknown
  }
  base?: {
    enableIstioConfigCRDs?: boolean
    [k: string]: unknown
  }
  [k: string]: unknown
}
