import { Construct, Duration } from '@aws-cdk/core';
import { ClusterInfo } from '../../spi';
import { LifecycleTransition, LifecycleHook, AutoScalingGroup } from '@aws-cdk/aws-autoscaling';
import { Queue } from '@aws-cdk/aws-sqs';
import { QueueHook } from '@aws-cdk/aws-autoscaling-hooktargets';
import * as iam from '@aws-cdk/aws-iam';
import { Rule, EventPattern } from '@aws-cdk/aws-events';
import { SqsQueue } from '@aws-cdk/aws-events-targets';
import { HelmAddOn, HelmAddOnUserProps } from '../helm-addon';
import { tagAsg } from '../../utils';
import { Cluster, ServiceAccount } from '@aws-cdk/aws-eks';

/**
 * Supported Modes
 */
enum Mode {
  IMDS,
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
  version: '0.16.0',
  release: 'ssp-addon-aws-node-termination-handler',
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
    const asgCapacity = clusterInfo.autoScalingGroup;

    // No support for Fargate and Managed Node Groups, lets catch that
    console.assert(asgCapacity, 'AWS Node Termination Handler is only supported for self-managed nodes');

    // Create an SQS Queue
    if (asgCapacity) {
      let helmValues: any;

      // Create Service Account
      const serviceAccount = cluster.addServiceAccount('aws-nth-sa', {
        name: 'aws-node-termination-handler-sa',
        namespace: this.options.namespace,
      });

      // Get the appropriate Helm Values depending upon the Mode selected
      if (this.options.mode === Mode.IMDS) {
        helmValues = this.configureImdsMode(serviceAccount);
      }
      else {
        helmValues = this.configureQueueMode(cluster, serviceAccount, asgCapacity);
      }

      // Deploy the helm chart
      const awsNodeTerminationHandlerChart = this.addHelmChart(clusterInfo, helmValues);
      awsNodeTerminationHandlerChart.node.addDependency(serviceAccount);
    }
  }

  /**
   * Configures IMDS Mode
   * @param serviceAccount 
   * @returns Helm values
   */
  private configureImdsMode(serviceAccount: ServiceAccount): any {
    return {
      enableSpotInterruptionDraining: true,
      enableRebalanceMonitoring: true,
      enableScheduledEventDraining: true,
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
  private configureQueueMode(cluster: Cluster, serviceAccount: ServiceAccount, asgCapacity: AutoScalingGroup): any {
    const queue = new Queue(cluster.stack, `aws-nth-queue`, {
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

    // Setup a Termination Lifecycle Hook on an ASG
    new LifecycleHook(cluster.stack, `aws-nth-lifecycle-hook`, {
      lifecycleTransition: LifecycleTransition.INSTANCE_TERMINATING,
      heartbeatTimeout: Duration.minutes(15),
      notificationTarget: new QueueHook(queue),
      autoScalingGroup: asgCapacity!
    });

    // Tag the ASG
    const tags = [
      {
        Key: 'aws-node-termination-handler/managed',
        Value: 'true'
      }
    ];
    tagAsg(cluster.stack, asgCapacity!.autoScalingGroupName, tags);

    // Create Amazon EventBridge Rules
    this.createEvents(cluster.stack, queue);

    // Service Account Policy
    serviceAccount.addToPrincipalPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'autoscaling:CompleteLifecycleAction',
        'autoscaling:DescribeAutoScalingInstances',
        'autoscaling:DescribeTags'
      ],
      resources: [asgCapacity!.autoScalingGroupArn]
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
      serviceAccount: {
        create: false,
        name: serviceAccount.serviceAccountName,
      }
    };
  }

  /**
   * Create EventBridge rules with target as SQS queue
   * @param scope 
   * @param queue 
   */
  private createEvents(scope: Construct, queue: Queue): void {
    const target = new SqsQueue(queue);
    const eventPatterns: EventPattern[] = [
      {
        source: ['aws.autoscaling'],
        detailType: ['EC2 Instance-terminate Lifecycle Action']
      },
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
        detailType: ['AWS Health Even'],
      }
    ];

    eventPatterns.forEach((event, index) => {
      const rule = new Rule(scope, `rule-${index}`, { eventPattern: event });
      rule.addTarget(target);
    });
  }
}