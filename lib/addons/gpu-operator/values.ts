export interface ValuesSchema {
    ccManager?: {
        enabled?: boolean
        [k: string]: unknown
    }
    cdi?: {
        enabled?: boolean
        default?: boolean
        [k: string]: unknown
    }
    daemonsets?: {
        annotations?: {
            [k: string]: unknown
        }
        labels?: {
            [k: string]: unknown
        }
        [k: string]: unknown
    }
    driver?: {
        enabled?: boolean
        repository?: string
        rdma?: {
            enabled?: boolean
            useHostMofed?: boolean
            [k: string]: unknown
        }
        startupProbe?: string
        usePrecompiled?: boolean
        version?: string
        [k: string]: unknown
    }
    kataManager?: {
        enabled?: boolean
        [k: string]: unknown
    }
    mig?: {
        strategy?: 'mixed' | 'single'
        [k: string]: unknown
    }
    migManager?: {
        enabled?: boolean
        [k: string]: unknown
    }
    nfd?: {
        enabled?: boolean
        nodefeaturerules?: boolean
        [k: string]: unknown
    },
    operator?: {
        defaultRuntime?: string
        labels?: {
            [k: string]: unknown
        }
    }
    psp?: {
        enabled?: boolean
        [k: string]: unknown
    }
    toolkit?: {
        enabled?: boolean
        [k: string]: unknown

    }
}