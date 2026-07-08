import * as assert from "assert";
import { Construct } from "constructs";
import "reflect-metadata";
import { ClusterAddOn, ClusterInfo } from '../spi';
import * as semver from "semver";
import { logger } from "./log-utils";

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
  
  return function (target: any, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function( ...args: any[]) {
      const dependencies = Array<Promise<Construct>>();
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;

      addOns.forEach( (addOn) => {
        if(clusterInfo.autoMode && isAutoModeAddon(addOn)) {
          return;
        }
        const dep = clusterInfo.getScheduledAddOn(addOn);
       
        let targetString = target?.constructor?.toString().split("\n")[0] ?? "unknown";

        assert(dep, `Missing a dependency for ${addOn} for ${stack} and target ${targetString}`);
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
  return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function( ...args: any[]) {
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

function compareAddonEksVersions(version1: string, version2: string): number {
  // Extract semver and build number from both versions
  const [semver1, build1] = parseEksVersion(version1);
  const [semver2, build2] = parseEksVersion(version2);

  // Compare semver parts first
  const semverCompare = semver.compare(semver1, semver2);
  if (semverCompare !== 0) return semverCompare;

  // If semver parts are equal, compare build numbers
  return build1 - build2;
}

    // Helper function to parse EKS version
function parseEksVersion(version: string): [string, number] {
  const match = version.match(/^v?(\d+\.\d+\.\d+)(?:-eksbuild\.(\d+))?$/);
  if (!match) {
    throw new Error(`Invalid EKS version format: ${version}`);
  }
  return [match[1], parseInt(match[2] || '0', 10)];
}

export enum AutoModeConflictType {
  VERSION_MISMATCH = "version-mismatch",
  VERSION_UNKNOWN = "version-unknown",
  ALREADY_INSTALLED = "already-installed", 
  NOT_SUPPORTED = "not-supported"
}

function getAutoModeMessage(conflictType: AutoModeConflictType, addonName: string, version?: string, minVersion?: string): string {
  const messages: Record<AutoModeConflictType, string> = {
    [AutoModeConflictType.VERSION_MISMATCH]: `Add-on ${addonName} version ${version} is incompatible. Minimum required version: ${minVersion}`,
    [AutoModeConflictType.VERSION_UNKNOWN]: `Add-on ${addonName} version could not be determined. Please verify compatibility at https://docs.aws.amazon.com/eks/latest/userguide/auto-enable-existing.html#auto-addons-required`,
    [AutoModeConflictType.ALREADY_INSTALLED]: `Add-on ${addonName} is already available on the cluster with EKS Auto Mode`,
    [AutoModeConflictType.NOT_SUPPORTED]: `Add-on ${addonName} is not supported on EKS Auto Mode`
  };
  return messages[conflictType];
}

export function conflictsWithAutoMode(conflictType: AutoModeConflictType, minExpectedVersion?: string) {
  return function(target: object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(this: any, ...args: any[]) {
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;
      const addonName = this.constructor.name;
      if (!clusterInfo.autoMode) {
        return originalMethod.apply(this, args);
      }
      let version = null;
      if('getAddonVersion' in this && typeof this.getAddonVersion === 'function'){
        version = this.getAddonVersion();
      }

      switch (conflictType) {
        case AutoModeConflictType.VERSION_UNKNOWN:
          logger.warn(getAutoModeMessage(conflictType, addonName, version, minExpectedVersion));
          return originalMethod.apply(this, args);
        case AutoModeConflictType.VERSION_MISMATCH:
          if (version === "auto") {
            logger.warn(getAutoModeMessage(AutoModeConflictType.VERSION_UNKNOWN, addonName, version, minExpectedVersion));
            return originalMethod.apply(this, args);
          }
          if (compareAddonEksVersions(version, minExpectedVersion!) >= 0) {
            return originalMethod.apply(this, args);
          }
        case AutoModeConflictType.NOT_SUPPORTED:
        case AutoModeConflictType.ALREADY_INSTALLED:
          throw new Error(`Deploying ${stack} failed. ${getAutoModeMessage(conflictType, addonName, version, minExpectedVersion)}`);
      }
    };

        return descriptor;
  };
}

export function mustRunOnAutoMode() {
  return function(target: object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function(this: any, ...args: any[]) {
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;
      const addonName = this.constructor.name;
      if (clusterInfo.autoMode) {
        return originalMethod.apply(this, args);
      } else {
        throw new Error(`Deploying ${stack} failed. Add-on ${addonName} can only be run on EKS Auto Mode clusters.`);
      }
    };

        return descriptor;

  };


}

export function conflictsWithCapabilities(...capabilities: string[]) {
  return function (target: object, key: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function( ...args: any[]) {
      const clusterInfo: ClusterInfo = args[0];
      const stack = clusterInfo.cluster.stack.stackName;

      capabilities.forEach( (capability) => {
        const dep = clusterInfo.getCapability(capability);
        if (dep){
          throw new Error(`Deploying ${stack} failed due to conflicting EKS Capability: ${capability}.`);
        }
      });

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Checks if the passed addon is part of auto mode and deployed by the EKS CP. 
 * @param addOn addOn name to check
 * @returns true if it is one of the addOns that is managed by the EKS in Auto Mode
 */
function isAutoModeAddon(addOn: string) : boolean {
  const automodeAddons = [
    "EbsCsiDriverAddOn",
    "AwsLoadBalancerControllerAddOn",
    "EksPodIdentityAgentAddOn",
    "VpcCniAddOn",
    "CoreDnsAddOn",
    "KubeProxyAddOn",
  ];
  return automodeAddons.includes(addOn);
}

