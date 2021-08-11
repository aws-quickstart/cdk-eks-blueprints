
import * as cdk from '@aws-cdk/core';
import * as ec2 from "@aws-cdk/aws-ec2";
import { ScopedAws, StackProps } from '@aws-cdk/core';
import { IVpc } from '@aws-cdk/aws-ec2';
import { KubernetesVersion } from '@aws-cdk/aws-eks';
import { Construct } from 'constructs';
<<<<<<< HEAD

import { Team, TeamProps } from '../teams'
import { ClusterAddOn, ClusterPostDeploy, ClusterProvider } from './cluster-types'
=======
>>>>>>> main
import { EC2ClusterProvider } from '../cluster-providers/ec2-cluster-provider';
import { ClusterAddOn, Team, ClusterProvider, ClusterPostDeploy } from '../spi';

export class EksBlueprintProps {

    /**
     * The id for the blueprint.
     */
    readonly id: string;

    /**
     * Defaults to id if not provided
     */
    readonly name?: string;

    /**
     * Add-ons if any.
     */
    readonly addOns?: Array<ClusterAddOn> = [];

    /**
     * Teams if any
     */
    readonly teams?: Array<Team> = [];

    /**
     * EC2 or Fargate are supported in the blueprint but any implementation conforming the interface
     * will work
     */
    readonly clusterProvider?: ClusterProvider = new EC2ClusterProvider;

    /**
     * Kubernetes version (must be initialized for addons to work properly)
     */
    readonly version?: KubernetesVersion = KubernetesVersion.V1_20;

}

/**
 * Adds usage tracking info to the stack props
 * @param usageIdentifier 
 * @param stackProps 
 * @returns 
 */
function withUsageTracking(usageIdentifier: string, stackProps?: StackProps): StackProps {
    const result =  stackProps ?? {};
    const trackableDescription = `${result.description?? ""} SSP tacking (${usageIdentifier})`.trimLeft();
    return { ...stackProps, ...{description: trackableDescription}};
}

/**
 * Blueprint builder implements a builder pattern that improves readability (no bloated constructors)
 * and allows creating a blueprint in an abstract state that can be applied to various instantiations 
 * in accounts and regions. 
 */
export class BlueprintBuilder {

    private props: Partial<EksBlueprintProps>;
    private account?: string;
    private region?: string;

    constructor() {
        this.props = { addOns: new Array<ClusterAddOn>(), teams: new Array<Team>()};
    }

    public withName(name: string) : this {
        this.props = {...this.props, ...{name}};
        return this;
    }

    public withAccount(account?: string): this {
        this.account = account;
        return this;
    }

    public withRegion(region?: string) : this {
        this.region = region;
        return this;
    }

    public withBlueprintProps(props: Partial<EksBlueprintProps>) : this {
        this.props = {...this.props, ...props};
        return this;
    }

    public withAddons(...addOns: ClusterAddOn[]) : this {
        this.props = {...this.props, ...{ addOns: this.props.addOns?.concat(addOns)}};
        return this;
    }

    public withId( id: string): this {
        this.props = { ...this.props, ...{id}};
        return this;
    }

    public withTeams(...teams: Team[]) : this {
        this.props = {...this.props, ...{teams: this.props.teams?.concat(teams)}};
        return this;
    }

    public build(scope: Construct, id: string, stackProps? : StackProps): EksBlueprint {
        return new EksBlueprint(scope, {...this.props, ...{id}}, 
            {...stackProps, ...{ env: {account: this.account, region: this.region}}});
    }

    public clone(region?: string, account?: string): BlueprintBuilder {
        return new BlueprintBuilder().withBlueprintProps(Object.create(this.props))
            .withAccount(account).withRegion(region);
    }
}


/**
 * Entry point to the platform provisioning. Creates a CFN stack based on the provided configuration
 * and orcherstrates provisioning of add-ons, teams and post deployment hooks. 
 */
export class EksBlueprint extends cdk.Stack {
    
    constructor(scope: Construct, blueprintProps: EksBlueprintProps, props?: StackProps) {
        super(scope, blueprintProps.id, withUsageTracking("qs-1s1r465hk", props));
        this.validateInput(blueprintProps);
        /*
         * Supported parameters
        */
        const vpcId = this.node.tryGetContext("vpc");
        const vpc = this.initializeVpc(vpcId);

        const clusterProvider = blueprintProps.clusterProvider ?? new EC2ClusterProvider;

        const clusterInfo = clusterProvider.createCluster(this, vpc, blueprintProps.version ?? KubernetesVersion.V1_19);
        const postDeploymentSteps = Array<ClusterPostDeploy>();
        const promises = Array<Promise<any>>();

        for (let addOn of (blueprintProps.addOns ?? [])) { // must iterate in the strict order
            const result : any = addOn.deploy(clusterInfo);
            if(result) {
                promises.push(<Promise<any>>result);
            }
            const postDeploy : any = addOn;
            if((postDeploy as ClusterPostDeploy).postDeploy !== undefined) {
                postDeploymentSteps.push(<ClusterPostDeploy>postDeploy);
            }
        }
        
        if (blueprintProps.teams != null) {
            for(let team of blueprintProps.teams) {
                team.setup(clusterInfo);
            }
        }

        Promise.all(promises).then(() => {
            for(let step of postDeploymentSteps) {
                step.postDeploy(clusterInfo, blueprintProps.teams ?? []);
            }
        }).catch(err => { throw new Error(err)});
    }

    private validateInput(blueprintProps: EksBlueprintProps) {
        const teamNames = new Set<string>();
        if (blueprintProps.teams) {
            blueprintProps.teams.forEach(e => {
                if (teamNames.has(e.name)) {
                    throw new Error(`Team ${e.name} is registered more than once`);
                }
                teamNames.add(e.name);
            });
        }
    }

    initializeVpc(vpcId: string): IVpc {
        const id = this.node.id;
        let vpc = undefined;

        if (vpcId != null) {
            if (vpcId === "default") {
                console.log(`looking up completely default VPC`);
                vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { isDefault: true });
            } else {
                console.log(`looking up non-default ${vpcId} VPC`);
                vpc = ec2.Vpc.fromLookup(this, id + "-vpc", { vpcId: vpcId });
            }
        }

        if (vpc == null) {
            // It will automatically divide the provided VPC CIDR range, and create public and private subnets per Availability Zone.
            // Network routing for the public subnets will be configured to allow outbound access directly via an Internet Gateway.
            // Network routing for the private subnets will be configured to allow outbound access via a set of resilient NAT Gateways (one per AZ).
            vpc = new ec2.Vpc(this, id + "-vpc");
        }

        return vpc;
    }
}