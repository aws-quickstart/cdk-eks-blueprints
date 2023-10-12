import * as yaml from "../../lib/utils/yaml-utils";

describe('Unit tests for yaml utils', () => {
    
    test("The YAML Document file is read correctly", () => {
        const doc = yaml.readYamlDocument(__dirname +'/yaml-test.yaml');

        expect(doc).toBe("apiVersion: apps/v1");
    });

    test("The YAML Document file is serialized correctly", () => {
        const sample = {"apiVersion":"apps/v1","resource":"Deployment"};

        const serialized = yaml.serializeYaml(sample);

        expect(serialized.length).toBe(41);
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

    test("External YAML Document is read correctly", () => {
        const doc = yaml.loadExternalYaml('https://raw.githubusercontent.com/kubernetes/examples/master/guestbook/legacy/frontend-controller.yaml');
        const part = {
            apiVersion: "v1",
            kind: "ReplicationController",
            metadata: {name: "frontend"},
            spec: {
                replicas: 3,
                template: {
                    metadata: {
                        labels: {app: "guestbook", tier: "frontend"}
                    },
                    spec: {
                        containers: [{
                            name: "php-redis",
                            image: "gcr.io/google_samples/gb-frontend:v4",
                            resources: {
                                requests: {
                                    cpu: "100m",
                                    memory: "100Mi"
                                }     
                            },
                            env: [{name: "GET_HOSTS_FROM", value: "dns"}],
                            ports:[{containerPort: 80}]
                        }]
                    }
                }
            }
        };

        expect(doc.length).toBe(1);
        expect(doc[0]).toStrictEqual(part);
    });

    test("External YAML Document with multiple resources is read correctly", () => {
        const doc = yaml.loadMultiResourceExternalYaml('https://raw.githubusercontent.com/kubernetes/examples/master/guestbook/all-in-one/frontend.yaml');
        const firstPart = {
            apiVersion: "v1",
            kind: "Service",
            metadata: {
                name: "frontend",
                labels:{
                    app: "guestbook",
                    tier: "frontend"
                }
            },
            spec:
            {
                type: "NodePort", 
                ports: [{port: 80}],
                selector: {
                    app: "guestbook",
                    tier: "frontend"
                }
            }
        };

        expect(doc.length).toBe(2);
        expect(doc[0]).toStrictEqual(firstPart);
    });
});
