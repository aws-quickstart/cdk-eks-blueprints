
import { Construct } from '@aws-cdk/core';
import { ClusterAddOn, ClusterInfo } from '../spi';

/**
 * Returns AddOn Id if defined else returns the class name
 * @param addOn
 * @returns string
 */
export function getAddOnNameOrId(addOn: ClusterAddOn): string {
  return addOn.id ?? addOn.constructor.name;
}

export function dependable(addOns: Array<string>) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return function (target: Object, key: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value;

    descriptor.value = function( ...args: any[]) {
      const dependencies = Array<Promise<Construct>>();
      const clusterInfo: ClusterInfo = args[0];

      addOns.forEach( (addOn) => {
        const dep = clusterInfo.getScheduledAddOn(addOn);
        console.assert(dep, `Missing dependency for ${addOn}`);
        dependencies.push(dep!);
      });

      const result: Promise<Construct> = original.apply(this, args);

      Promise.all(dependencies.values()).then((constructs) => {
        constructs.forEach((construct) => {
            result.then((resource) => {
              resource.node.addDependency(construct);
            });
        });
      }).catch(err => { throw new Error(err) });

      return result;
    };

    return descriptor;
  };
}