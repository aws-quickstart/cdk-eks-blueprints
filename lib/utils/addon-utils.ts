import * as assert from "assert";
import { Construct } from "constructs";
import "reflect-metadata";
import {ClusterAddOn, ClusterInfo, Values} from '../spi';
import {escapeDots} from "./string-utils";

/**
 * Returns AddOn Id if defined else returns the class name
 * @param addOn
 * @returns string
 */
export function getAddOnNameOrId(addOn: ClusterAddOn): string {
  return addOn.id ?? addOn.constructor.name;
}

export function isOrderedAddOn(addOn: ClusterAddOn) : boolean {
    return Reflect.getMetadata("ordered", addOn.constructor) ?? Reflect.getMetadata("ordered", addOn) ?? false;
}
/**
 * Decorator function that accepts a list of AddOns and
 * ensures addons are scheduled to be added as well as
 * add them as dependencies
 * @param addOns 
 * @returns 
 */
export function dependable(...addOns: string[]) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function( ...args: any[]) {
      const dependencies = Array<Promise<Construct>>();
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;

      addOns.forEach( (addOn) => {
        const dep = clusterInfo.getScheduledAddOn(addOn);
        assert(dep, `Missing a dependency for ${addOn} for ${stack}`); 
        dependencies.push(dep!);
      });

      const result: Promise<Construct> = originalMethod.apply(this, args);

      Promise.all(dependencies.values()).then((constructs) => {
        constructs.forEach((construct) => {
            result.then((resource) => {
              resource.node.addDependency(construct);
            });
        });
      }).catch(err => { throw new Error(err); });

      return result;
    };

    return descriptor;
  };
}

/**
 * Decorator function that accepts a list of AddOns and
 * throws error if those addons are scheduled to be added as well
 * As they should not be deployed with
 * @param addOns 
 * @returns 
 */
export function conflictsWith(...addOns: string[]) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function( ...args: any[]) {
      // const dependencies: (Promise<Construct> | undefined)[] = [];
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;

      addOns.forEach( (addOn) => {
        const dep = clusterInfo.getScheduledAddOn(addOn);
        if (dep){
          throw new Error(`Deploying ${stack} failed due to conflicting add-on: ${addOn}.`);
        }
      });

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Iterate an object to normalize the string format before sending to helm.
 * For example, escaping the dot from certain keys: "ingress.annotations.kubernetes\\.io/tls-acme"
 * @returns Values
 * @param obj: Values
 */
export function normalizeValues(obj: Values): Values {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      obj[key] = normalizeValues(obj[key]);
    }

    const escapedKey = escapeDots(key);
    if (escapedKey != key) {
      obj[escapedKey] = obj[key];
      delete obj[key];
    }
  });

  return obj;
}
