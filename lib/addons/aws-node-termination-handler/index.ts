import { AutoScalingGroup, LifecycleHook, LifecycleTransition } from 'aws-cdk-lib/aws-autoscaling';
import { QueueHook } from 'aws-cdk-lib/aws-autoscaling-hooktargets';
import { Cluster, ServiceAccount } from 'aws-cdk-lib/aws-eks';
import { EventPattern, Rule } from 'aws-cdk-lib/aws-events';
import { SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Duration } from 'aws-cdk-lib';
import { Construct } from "constructs";
import * as assert from "assert";
import { ClusterInfo } from '../../spi';
import { tagAsg } from '../../utils';
import { HelmAddOn, HelmAddOnUserProps } from '../helm-addon';

/**
 * Supported Modes
 */
export enum Mode {
  /**
   * IMDS Mode
   */
  IMDS,

  /**
   * Queue Mode
   */
  QUEUE
}

/**
 * Configuration for the add-on
 */
export interface AwsNodeTerminationHandlerProps extends HelmAddOnUserProps {
  /**
   * Supported Modes are Mode.IMDS and Mode.QUEUE
   * @default Mode.IMDS
   */
  mode?: Mode
}

/**
 * Default options for the add-on
 */
const defaultProps: AwsNodeTerminationHandlerProps = {
  chart: 'aws-node-termination-handler',
  repository: 'https://aws.github.io/eks-charts',
  version: '0.20.2',
  release: 'blueprints-addon-aws-node-termination-handler',
  name: 'aws-node-termination-handler',
  namespace: 'kube-system',
  mode: Mode.IMDS
};

export class AwsNodeTerminationHandlerAddOn extends HelmAddOn {

  private options: AwsNodeTerminationHandlerProps;

  constructor(props?: AwsNodeTerminationHandlerProps) {
    super({ ...defaultProps as any, ...props });
    this.options = this.props;
  }

  /**
   * Implementation of the deploy interface
   * @param clusterInfo 
   */
  deploy(clusterInfo: ClusterInfo): void {
    const cluster = clusterInfo.cluster;    
    const asgCapacity = clusterInfo.autoscalingGroups || [];

    const karpenter = clusterInfo.getScheduledAddOn('KarpenterAddOn');
    if (!karpenter){
      // No support for Fargate and Managed Node Groups, lets catch that
      assert(asgCapacity && asgCapacity.length > 0, 'AWS Node Termination Handler is only supported for self-managed nodes');
    }    

    // Create an SQS Queue
    let helmValues: any;

    // Create Service Account
    const serviceAccount = cluster.addServiceAccount('aws-nth-sa', {
        name: 'aws-node-termination-handler-sa',
        namespace: this.options.namespace,
    });

    // Get the appropriate Helm Values depending upon the Mode selected
    if (this.options.mode === Mode.IMDS) {
        helmValues = this.configureImdsMode(serviceAccount, karpenter);
    }
    else {
        helmValues = this.configureQueueMode(cluster, serviceAccount, asgCapacity, karpenter);
    }
    
    // Deploy the helm chart
    const awsNodeTerminationHandlerChart = this.addHelmChart(clusterInfo, helmValues);
    awsNodeTerminationHandlerChart.node.addDependency(serviceAccount);
  }

  /**
   * Configures IMDS Mode
   * @param serviceAccount 
   * @returns Helm values
   */
    private configureImdsMode(serviceAccount: ServiceAccount, karpenter: Promise<Construct> | undefined): any {
        return {
            enableSpotInterruptionDraining: true,
            enableRebalanceMonitoring: true,
            enableRebalanceDraining: karpenter ? true : false,
            enableScheduledEventDraining: true,
            nodeSelector: karpenter ? {'karpenter.sh/capacity-type': 'spot'} : {},
            serviceAccount: {
                create: false,
                name: serviceAccount.serviceAccountName,
            }
        };
    }

  /**
   * Configures Queue Mode
   * @param cluster
   * @param serviceAccount
   * @param asgCapacity
   * @returns Helm values
   */
    private configureQueueMode(cluster: Cluster, serviceAccount: ServiceAccount, asgCapacity: AutoScalingGroup[], karpenter: Promise<Construct> | undefined): any {
        const queue = new Queue(cluster.stack, "aws-nth-queue", {
            retentionPeriod: Duration.minutes(5)
        });
        queue.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [
                new iam.ServicePrincipal('events.amazonaws.com'),
                new iam.ServicePrincipal('sqs.amazonaws.com'),
            ],
            actions: ['sqs:SendMessage'],
            resources: [queue.queueArn]
        }));

        const resources: string[] = [];

        // This does not apply if you leverage Karpenter (which uses NTH for Spot/Fargate)
        if (!karpenter){
          for (let i = 0; i < asgCapacity.length; i++) {
              const nodeGroup = asgCapacity[i];
              // Setup a Termination Lifecycle Hook on an ASG
              new LifecycleHook(cluster.stack, `aws-${nodeGroup.autoScalingGroupName}-nth-lifecycle-hook`, {
                  lifecycleTransition: LifecycleTransition.INSTANCE_TERMINATING,
                  heartbeatTimeout: Duration.minutes(5), // based on https://github.com/aws/aws-node-termination-handler docs
                  notificationTarget: new QueueHook(queue),
                  autoScalingGroup: nodeGroup
              });

              // Tag the ASG
              const tags = [{
                  Key: 'aws-node-termination-handler/managed',
                  Value: 'true'
              }];
              tagAsg(cluster.stack, nodeGroup.autoScalingGroupName, tags);
              resources.push(nodeGroup.autoScalingGroupArn);
          }
        }

        // Create Amazon EventBridge Rules
        this.createEvents(cluster.stack, queue, karpenter);

        // Service Account Policy
        serviceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'autoscaling:CompleteLifecycleAction',
                'autoscaling:DescribeAutoScalingInstances',
                'autoscaling:DescribeTags'
            ],
            resources: karpenter ? ['*'] : resources
        }));

        serviceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['ec2:DescribeInstances'],
            resources: ['*']
        }));
        queue.grantConsumeMessages(serviceAccount);

        return {
            enableSqsTerminationDraining: true,
            queueURL: queue.queueUrl,
            awsRegion: karpenter ? cluster.stack.region: '',
            serviceAccount: {
                create: false,
                name: serviceAccount.serviceAccountName,
            },
            checkASGTagBeforeDraining: karpenter ? false : true,
            enableSpotInterruptionDraining: karpenter ? true : false,
        };
    }

  /**
   * Create EventBridge rules with target as SQS queue
   * @param scope 
   * @param queue 
   */
  private createEvents(scope: Construct, queue: Queue, karpenter: Promise<Construct> | undefined): void {
    const target = new SqsQueue(queue);
    const eventPatterns: EventPattern[] = [
      {
        source: ['aws.ec2'],
        detailType: ['EC2 Spot Instance Interruption Warning']
      },
      {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance Rebalance Recommendation']
      },
      {
        source: ['aws.ec2'],
        detailType: ['EC2 Instance State-change Notification']
      },
      {
        source: ['aws.health'],
        detailType: ['AWS Health Event'],
      }
    ];

    if (!karpenter){
      eventPatterns.push(
        {
          source: ['aws.autoscaling'],
          detailType: ['EC2 Instance-terminate Lifecycle Action']
        },
      );
    }

    eventPatterns.forEach((event, index) => {
      const rule = new Rule(scope, `rule-${index}`, { eventPattern: event });
      rule.addTarget(target);
    });
  }
}