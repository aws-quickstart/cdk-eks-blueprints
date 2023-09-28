export enum ArchType {
  ARM = "arm",
  X86 = "x86",
}

export const addonArchitectureMap = new Map<string,ArchType[]>();

/**
 * Returns true of false depending on if the passed addon is 
 * supported by the passed architecture
 * @param addOn, arch
 * @returns boolean
 */

export function isSupportedArchitecture(addOnName: string, arch: ArchType) : boolean | undefined {

  const archs = addonArchitectureMap.get(addOnName);
  if (archs === undefined) {
    if (arch === ArchType.X86) {
      return true;
    }
    else {
      return false;
    }
  }
  return archs.includes(arch);
}

export function validateSupportedArchitecture(addOnName: string, arch: ArchType, strictValidation?: boolean ) : void {
  if (!isSupportedArchitecture(addOnName, arch)) {
    if ((strictValidation) || (strictValidation === undefined)) {
      throw new Error(`Addon ${addOnName} is not supported on architecture ${arch}`);
    }
    else {
      console.warn(`Addon ${addOnName} is not supported on architecture ${arch}`);
    }
  }
}

/**
 * Decorator function that accepts a list of architectures and
 * adds this metatdata to globalmap.
 * @param arch
 * @returns 
 */

export function supportsX86(constructor: Function) {
  const addonName = constructor.name;
  addAddonArch(addonName, ArchType.X86);
}

export function supportsARM(constructor: Function) {
  const addonName = constructor.name;
  addAddonArch(addonName, ArchType.ARM);
}

export function supportsALL(constructor: Function) {
  const addonName = constructor.name;
  addAddonArch(addonName, ArchType.X86);
  addAddonArch(addonName, ArchType.ARM);
}

function addAddonArch(addonName: string, architecture: ArchType) {
  if (addonArchitectureMap.has(addonName)) {
    const value = addonArchitectureMap.get(addonName);
    if (value !== undefined) {
      value.push(architecture);
    }
    else {
      addonArchitectureMap.set(addonName, [architecture]);
    }
  }
  else {
    addonArchitectureMap.set(addonName, [architecture]);
  }
}