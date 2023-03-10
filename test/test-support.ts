import { NestedStack, NestedStackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { NestedStackBuilder } from '../lib';


export class MyVpcStack extends NestedStack {

    readonly vpc: ec2.Vpc;

    public static builder(): NestedStackBuilder {
        return {
            build(scope: Construct, id: string, props: NestedStackProps) {
                return new MyVpcStack(scope, id, props);
            }
        };
    }

    constructor(scope: Construct, id: string, props: NestedStackProps) {
        super(scope, id, props);
        this.vpc = new ec2.Vpc(this, 'test-vpc', {
            ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/20'),
            natGateways: 0,
            maxAzs: 2,
            enableDnsHostnames: true,
            enableDnsSupport: true,
            subnetConfiguration: [
                {
                    cidrMask: 22,
                    name: 'public',
                    subnetType: ec2.SubnetType.PUBLIC,
                },
                {
                    cidrMask: 22,
                    name: 'private',
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                },
            ],
        });
    }
}