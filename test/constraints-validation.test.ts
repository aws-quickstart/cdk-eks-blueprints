
import * as cdk from 'aws-cdk-lib';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { z, ZodError } from 'zod';
import * as blueprints from '../lib';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
];

const tooBigNumber5000 = new z.ZodError([{
  code: "too_big",
  maximum: 5000,
  type: "number",
  inclusive: true,
  path: [],
  message: ""
}]);

const tooBigString63 = new z.ZodError([{
  code: "too_big",
  maximum: 63,
  type: "string",
  inclusive: true,
  path: [],
  message: ""
}]);

const tooSmallString1 = new z.ZodError([{
  code: "too_small",
  minimum: 1,
  type: "string",
  inclusive: true,
  path: [],
  message: ""
}]);

const tooSmallNumber0 = new z.ZodError([{
  code: "too_small",
  minimum: 0,
  type: "number",
  inclusive: true,
  path: [],
  message: ""
}]);

const notUrlError = new z.ZodError([{
  validation: "url",
  code: "invalid_string",
  message: "",
  path: []
}]);

const longName = 'eks-blueprint-with-an-extra-kind-of-very-long-name-that-is-definitely-not-going-to-work';

const blueprintBase = blueprints.EksBlueprint.builder().addOns(...addOns);

type Executable = () => void;

type DataError = [Executable, ZodError];

function createAutoScalingGroup(id: string, minSize?: number, maxSize?: number, desiredSize?: number) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_23,
    autoscalingNodeGroups: [
      {
        id: id,
        minSize: minSize,
        maxSize: maxSize,
        desiredSize: desiredSize
      }]
  });
}

function createManyAutoScalingGroup(length: number) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_23,
    autoscalingNodeGroups: loop(new Array<blueprints.AutoscalingNodeGroup>(length).fill({ id: "" }))
  });
}

function loop(array: Array<blueprints.AutoscalingNodeGroup>): blueprints.AutoscalingNodeGroup[] {
  for (let i = 0; i < array.length; i++) {
    array[i] = { id: "" + i };
  }
  return array;
}

function singleErrorInArray(id: string, errorNumberVariable?: number) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_23,
    autoscalingNodeGroups: [
      {
        id: id + 1
      },
      {
        id: id + 2
      },
      {
        id: id + 3
      },
      {
        id: id + 4,
        minSize: errorNumberVariable
      }
    ]
  });
}

function createFargateProfile(fargateProfileName: string) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_23,
    fargateProfiles: {
      "fp1": {
        fargateProfileName: fargateProfileName,
        selectors: [{ namespace: "serverless1" }]
      }
    }
  });
}

function getConstraintsDataSet(): DataError[] {

  let result: [Executable, ZodError][] = [];

  const blueprint1 = blueprintBase.clone().id(longName);
  const blueprint2 = blueprintBase.clone().enableControlPlaneLogTypes(blueprints.ControlPlaneLogType.AUTHENTICATOR).name("").id("idName");

  //be sure all blueprint tests built have a id defined before this!
  result.push([() => blueprint1.build(app, blueprint1.props.id!), tooBigString63]);
  result.push([() => blueprint2.build(app, blueprint2.props.id!), tooSmallString1]);

  result.push([() => createFargateProfile(longName), tooBigString63]);
  result.push([() => createFargateProfile(""), tooSmallString1]);

  result.push([() => createAutoScalingGroup(longName), tooBigString63]);
  result.push([() => createAutoScalingGroup(""), tooSmallString1]);
  result.push([() => createAutoScalingGroup("Name", 6000), tooBigNumber5000]);
  result.push([() => createAutoScalingGroup("Name", -1), tooSmallNumber0]);

  result.push([() => new blueprints.addons.MetricsServerAddOn({ name: longName }), tooBigString63]);
  result.push([() => new blueprints.addons.MetricsServerAddOn({ repository: "improper.website" }), notUrlError]);

  result.push([() => createManyAutoScalingGroup(6000), tooBigNumber5000]);
  result.push([() => singleErrorInArray("Name", 6000), tooBigNumber5000]);

  return result;
}

function compareIssues(object1: any, object2: any) {
  const keys1 = Object.keys(object1);
  const keys2 = Object.keys(object2);

  if (keys1.length !== keys2.length) {
    return false;
  }
  for (let key of keys1) {
    if (key == "message" || key == "path" || key == "inclusive") {
      continue;
    }

    if (object1[key] !== object2[key]) {
      return false;
    }
  }
  return true;
}

test("Given validation constraints are defined, when creating EKS Blueprints, ClusterProviders, and Helm Add-ons with invalid attributes, the tests will fail with the expected errors.", () => {
  getConstraintsDataSet().forEach((ex) => {
    try {
      ex[0]();
      throw new Error("No error was thrown as expected.");
    } catch (e) {
      if (e instanceof z.ZodError) {
        const thrownError = (e.issues[0] as any);
        const customError = (ex[1].issues[0] as any);
        expect(compareIssues(thrownError, customError)).toBe(true);
      }
      else {
        throw new Error ("An unexpected error was thrown in the test. Message: " + e);
      }
    }
  });
});