import { IResource } from 'aws-cdk-lib';
import { ResourceContext } from './types';
import { IConstruct } from 'constructs';

/** 
 * Generic resource provider interface. 
 **/
 export declare interface ResourceProvider<T extends IConstruct = IConstruct> {
    provide(context: ResourceContext): T;
}
