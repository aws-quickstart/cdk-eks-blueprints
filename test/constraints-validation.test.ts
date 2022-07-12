import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as blueprints from '../lib';
import { CONTROL_PLANE_LOG_TYPE } from '../lib';
import { z, ZodError } from 'zod';
import { KubernetesVersion } from 'aws-cdk-lib/aws-eks/lib';

const app = new cdk.App();

const addOns: Array<blueprints.ClusterAddOn> = [
  new blueprints.addons.MetricsServerAddOn(),
  new blueprints.addons.ClusterAutoScalerAddOn(),
  new blueprints.addons.VpcCniAddOn(),
];

const tooBigNumber100 = new z.ZodError([{
  code: "too_big",
  maximum: 100,
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

const tooBigNumber10 = new z.ZodError([{
  code: "too_big",
  maximum: 10,
  type: "number",
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
    version: KubernetesVersion.V1_21,
    autoscalingNodeGroups: [
      {
        id: id,
        minSize: minSize,
        maxSize: maxSize,
        desiredSize: desiredSize
      }]
  });
}

function manyAutoScalingGroup(id: string) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_21,
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
        id: id + 4
      },
      {
        id: id + 5
      },
      {
        id: id + 6
      },
      {
        id: id + 7
      },
      {
        id: id + 8
      },
      {
        id: id + 9
      },
      {
        id: id + 10
      },
      {
        id: id + 11
      }
    ]
  });
}

function singleErrorInArray(id: string, errorNumberVariable?: number) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_21,
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

function createFargatProfile(fargateProfileName: string) {
  return new blueprints.GenericClusterProvider({
    version: KubernetesVersion.V1_21,
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
  const blueprint2 = blueprintBase.clone().enableControlPlaneLogTypes(CONTROL_PLANE_LOG_TYPE.authenticator).name("").id("id name");

  //be sure all blueprint tests built have a id defined before this!
  result.push([() => blueprint1.build(app, blueprint1.props.id!), tooBigString63]);
  result.push([() => blueprint2.build(app, blueprint2.props.id!), tooSmallString1]);

  result.push([() => createFargatProfile(longName), tooBigString63]);
  result.push([() => createFargatProfile(""), tooSmallString1]);

  result.push([() => createAutoScalingGroup(longName), tooBigString63]);
  result.push([() => createAutoScalingGroup(""), tooSmallString1]);
  result.push([() => createAutoScalingGroup("Name", 5000), tooBigNumber100]);
  result.push([() => createAutoScalingGroup("Name", -1), tooSmallNumber0]);

  result.push([() => manyAutoScalingGroup("Name"), tooBigNumber10]);

  result.push([() => new blueprints.addons.MetricsServerAddOn({ name: longName }), tooBigString63]);
  result.push([() => new blueprints.addons.MetricsServerAddOn({ repository: "improper.website" }), notUrlError]);

  result.push([() => manyAutoScalingGroup("Name"), tooBigNumber10]);
  result.push([() => singleErrorInArray("Name", 345), tooBigNumber100]);

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

test("For Each loop test.", () => {
  getConstraintsDataSet().forEach((ex) => {
    try {
      ex[0]();
      expect(true).toBe(false);
    } catch (e) {
      if (e instanceof z.ZodError) {
        const thrownError = (e.issues[0] as any);
        const customError = (ex[1].issues[0] as any);
        expect(compareIssues(thrownError, customError)).toBe(true);
      }
    }
  });
});