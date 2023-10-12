import * as yaml from "../../lib/utils/yaml-utils";

describe('Unit tests for yaml utils', () => {
    
    test("The YAML Document file is read correctly", () => {
        const doc = yaml.readYamlDocument(__dirname +'/yaml-test.yaml');

        expect(doc).toBe("apiVersion: apps/v1");
    });

    test("The YAML Document file is serialized correctly", () => {
        const sample = {"apiVersion":"apps/v1","resource":"Deployment"};

        const serialized = yaml.serializeYaml(sample);

        expect(serialized.length).toBe(3);
    });

    test("The YAML Document with multiple resources is read correctly", () => {
        const doc = yaml.loadMultiResourceYaml(__dirname +'/multi-yaml-test.yaml');

        const firstPart = { "kind": "ClusterRole" };
        const secondPart = { "kind": "Deployment" };
        const lastPart = { "kind": "Pod" };
 
        expect(doc.length).toBe(4);
        expect(doc[1]).toStrictEqual(firstPart);
        expect(doc[2]).toStrictEqual(secondPart);
        expect(doc[3]).toStrictEqual(lastPart);
    });
});
