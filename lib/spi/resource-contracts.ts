import { ResourceContext } from './types';
import { IConstruct } from 'constructs';

/** 
 * Generic resource provider interface. 
 **/
<<<<<<< HEAD
 export declare interface ResourceProvider<T extends IConstruct = IConstruct> {
=======
 export declare interface ResourceProvider<T extends IConstruct = IResource> {
>>>>>>> 35f394bf (CFN resources can be returned by resource providers)
    provide(context: ResourceContext): T;
}
