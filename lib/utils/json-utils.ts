/**
 * Helper function to convert a key-pair values of provisioner spec configurations
 * To appropriate json format for addManifest function
 * @param specs 
 * @returns
 */
 export function convertToSpec(specs: { [key: string]: string[]; }): any[] {
  const newSpecs = []
  for (const key in specs){
      const value = specs[key]
      const requirement = {
          "key": key,
          "operator": "In",
          "values": value
      }
      newSpecs.push(requirement)
  }
  return newSpecs;
}