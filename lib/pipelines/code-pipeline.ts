import * as assert from "assert";
import * as cdk from 'aws-cdk-lib';
import { StackProps } from 'aws-cdk-lib';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import * as cdkpipelines from 'aws-cdk-lib/pipelines';
import { GitHubTrigger } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from "constructs";
import { ApplicationRepository, AsyncStackBuilder, StackBuilder } from '../spi';
import { withUsageTracking } from '../utils/usage-utils';

export {
    cdkpipelines
};

export { GitHubTrigger };

/**
 * credentialsType is excluded and the only supported credentialsSecret is a plaintext GitHub OAuth token.
 * repoUrl
 */
export interface GitHubSourceRepository extends Omit<ApplicationRepository, "credentialsType"> {
    /**
     * A GitHub OAuth token to use for authentication stored with AWS Secret Manager.
     * The provided name will be looked up using the following:
     * ```ts
     * const credentials = cdk.SecretValue.secretsManager('my-github-token');
     * ```
     *
     * The GitHub Personal Access Token should have these scopes:
     *
     * * **repo** - to read the repository
     * * **admin:repo_hook** - if you plan to use webhooks (true by default)
     *
     * @see https://docs.aws.amazon.com/codepipeline/latest/userguide/GitHub-create-personal-token-CLI.html
     */
    credentialsSecretName: string;

    /**
     * The owner of the repository for the pipeline (GitHub handle).
     */
    owner?: string;

    /**
     * How GitHub source action will be triggered.
     */
    trigger?: GitHubTrigger;
}

export interface CodeCommitSourceRepository
    extends Omit<ApplicationRepository, "credentialsType" | "credentialsSecretName " | "repoUrl"> {
    /**
     * The name of the CodeCommit repository.
     */
    codeCommitRepoName: string;

    /**
     * Optional CodeCommitSourceOptions.
     */
    codeCommitOptions?: cdkpipelines.CodeCommitSourceOptions;
}

export interface CodeStarConnectionRepository
  extends Omit<
    ApplicationRepository,
    'credentialsType' | 'credentialsSecretName '
  > {
  /**
   * The ARN of the CodeStar Connection.
   */
  codeStarConnectionArn: string;
  /**
   * The owner of the repository for the pipeline
   */
  owner?: string;
}

export function isCodeCommitRepo(
  repo:
    | GitHubSourceRepository
    | CodeCommitSourceRepository
    | CodeStarConnectionRepository
): boolean {
  return Object.prototype.hasOwnProperty.call(repo, 'codeCommitRepoName');
}

export function isCodeStarConnection(
  repo:
    | GitHubSourceRepository
    | CodeCommitSourceRepository
    | CodeStarConnectionRepository
): boolean {
  return Object.prototype.hasOwnProperty.call(repo, 'codeStarConnectionArn');
  
}



/**
 * Props for the Pipeline.
 */
export type PipelineProps = {

    /**
     * Application name (optional, default to the app set in the cdk.json)
     */
    application?: string;

    /**
     * The name for the pipeline.
     */
    name: string;

    /**
     * The owner of the repository for the pipeline (GitHub handle).
     */
    owner?: string;

    /**
     * Enable/Disable allowing cross-account deployments.
     */
    crossAccountKeys: boolean;

    /**
     * IAM policies to attach to the code build role. 
     * By default it allows access for lookups, including secret look-ups.
     * Passing an empty list will result in no extra-policies passed to the build role.
     * Leaving this unspecified will result in the default policy applied (not recommended for proudction).
     */
    codeBuildPolicies?: PolicyStatement[];

    /**
     * Repository for the pipeline (GitHub or CodeCommitRepository).
     */
    repository:
      | GitHubSourceRepository
      | CodeCommitSourceRepository
      | CodeStarConnectionRepository;

    /**
     * Pipeline stages and options.
     */
    stages: WaveStage[];

    /**
     * Waves for the pipeline. Stages inside the wave are executed in parallel.
     */
    waves: PipelineWave[];
}

/**
 * Stack stage is a builder construct to allow adding stages to a pipeline. Each stage is expected to produce a stack.
 */
export interface StackStage {
    /**
     * id of the stage
     */
    id: string;

    /**
     * Builder that can produce a stack which will be deployed as part of the stage
     */
    stackBuilder: StackBuilder;

    /**
     * Optional stage properties, such as {manualApprovals: true} which can control stage transitions.
     */
    stageProps?: cdkpipelines.AddStageOpts;
}

/**
 * Internal interface for wave stages
 */
export interface WaveStage extends StackStage {
    /**
     * Wave id if this stage is part of a wave. Not required if stage is supplied
     */
    waveId?: string,
}

/**
 * Represents wave configuration
 */
export interface PipelineWave {

    id: string,

    stages: StackStage[],

    props?: cdkpipelines.WaveProps
}

/**
 * Default policy for the CodeBuild role generated. 
 * It allows look-ups, including access to AWS Secrets Manager. 
 * Not recommended for production. For production use case, CodeBuild policies 
 * must be restricted to particular resources. Outbound access from the build should be 
 * controlled by ACL.
 */
export const DEFAULT_BUILD_POLICIES = [ new PolicyStatement({
    resources: ["*"],
    actions: [    
        "sts:AssumeRole",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "cloudformation:*",
        "eks:DescribeAddonVersions"
    ]
})];

/**
 * Builder for CodePipeline.
 */
export class CodePipelineBuilder implements StackBuilder {

    private props: Partial<PipelineProps>;

    constructor() {
        this.props = { crossAccountKeys: false, stages: [], waves: []};
    }

    public application(app: string): CodePipelineBuilder {
      this.props.application = app;
      return this;
    }

    public name(name: string): CodePipelineBuilder {
        this.props.name = name;
        return this;
    }

    public owner(owner: string) : CodePipelineBuilder {
        this.props.owner = owner;
        return this;
    }

    /**
     * For production use cases, make sure all policies are tied to concrete resources.
     * @param policies 
     * @returns 
     */
    public codeBuildPolicies(policies: PolicyStatement[]) : CodePipelineBuilder {
        this.props.codeBuildPolicies = policies;
        return this;
    }
 
    public enableCrossAccountKeys() : CodePipelineBuilder {
        this.props.crossAccountKeys = true;
        return this;
    }

  public repository(
    repo:
      | GitHubSourceRepository
      | CodeCommitSourceRepository
      | CodeStarConnectionRepository
  ): CodePipelineBuilder {
    this.props.repository = repo as GitHubSourceRepository;
    if (isCodeCommitRepo(repo)) {
      this.props.repository = repo as CodeCommitSourceRepository;
    }
    if (isCodeStarConnection(repo)) {
      this.props.repository = repo as CodeStarConnectionRepository;
    }
    return this;
  }

    /**
     * Adds standalone pipeline stages (in the order of invocation and elements in the input array)
     * @param stackStages
     * @returns
     */
    public stage(...stackStages: StackStage[]) : CodePipelineBuilder {
        stackStages.forEach(stage => this.props.stages!.push(stage));
        return this;
    }

    /**
     * Adds wave(s) in the order specified. All stages in the wave can be executed in parallel, while standalone stages are executed sequentially.
     * @param waves
     * @returns
     */
    public wave(...waves: PipelineWave[]) : CodePipelineBuilder {
        waves.forEach(wave => {
            this.props.waves!.push(wave);
            wave.stages.forEach(stage => this.props.stages?.push({...stage, ...{ waveId: wave.id}}));
        });
        return this;
    }

    build(scope: Construct, id: string, stackProps?: cdk.StackProps): cdk.Stack {
      assert(
        this.props.name,
        'name field is required for the pipeline stack. Please provide value.'
      );
      assert(
        this.props.stages,
        'Stage field is required for the pipeline stack. Please provide value.'
      );
      if (this.props.repository) {
        let gitHubRepo = this.props.repository as GitHubSourceRepository;
        if (!isCodeCommitRepo(this.props.repository)) {
          assert(
            this.props.owner || gitHubRepo.owner,
            'repository.owner field is required for the GitHub or CodeStar connection pipeline stack. Please provide value.'
          );
        }
      }
      const fullProps = this.props as PipelineProps;
      return new CodePipelineStack(scope, fullProps, id, stackProps);
    }
}


/**
 * Pipeline stack is generating a self-mutating pipeline to faciliate full CI/CD experience with the platform
 * for infrastructure changes.
 */
export class CodePipelineStack extends cdk.Stack {

    static readonly USAGE_ID = "qs-1s1r465k6";
    static readonly USAGE_ID_MULTI_ACCOUNT = "qs-1s1r465f2";

    static builder() {
        return new CodePipelineBuilder();
    }

    constructor(scope: Construct, pipelineProps: PipelineProps, id: string,  props?: StackProps) {
        if (pipelineProps.crossAccountKeys){
            super(scope, id, withUsageTracking(CodePipelineStack.USAGE_ID_MULTI_ACCOUNT, props));
        } else {
            super(scope, id, withUsageTracking(CodePipelineStack.USAGE_ID, props));
        }

        const pipeline = CodePipeline.build(this, pipelineProps);

        let promises : Promise<ApplicationStage>[] = [];

        for(let stage of pipelineProps.stages) {
            const appStage = new ApplicationStage(this, stage.id, stage.stackBuilder);
            promises.push(appStage.waitForAsyncTasks());
        }

        Promise.all(promises).then(stages => {
            let currentWave : cdkpipelines.Wave | undefined;

            for(let i in stages) {
                const stage = pipelineProps.stages[i];
                if(stage.waveId) {
                    if(currentWave == null || currentWave.id != stage.waveId) {
                        const waveProps = pipelineProps.waves.find(wave => wave.id === stage.waveId);
                        assert(waveProps, `Specified wave ${stage.waveId} is not found in the pipeline definition ${id}`);
                        currentWave = pipeline.addWave(stage.waveId, { ...waveProps.props });
                    }
                    currentWave.addStage(stages[i], stage.stageProps);
                }
                else {
                    pipeline.addStage(stages[i], stage.stageProps);
                }
            }
        });
    }
}


export class ApplicationStage extends cdk.Stage {

    private asyncTask: Promise<any>;

    constructor(scope: cdk.Stack, id: string, builder: StackBuilder | AsyncStackBuilder, props?: cdk.StageProps) {
        super(scope, id, props);
        if((<AsyncStackBuilder>builder).buildAsync !== undefined) {
            this.asyncTask = (<AsyncStackBuilder>builder).buildAsync(this, `${id}-blueprint`, props);
        }
        else {
            builder.build(this, `${id}-blueprint`, props);
        }
    }

    public async waitForAsyncTasks() : Promise<ApplicationStage> {
        if(this.asyncTask) {
            return this.asyncTask.then(()=> {
                return this;
            });
        }
        return Promise.resolve(this);
    }
}

/**
 * CodePipeline deploys a new CodePipeline resource that is integrated with a GitHub repository.
 */
class CodePipeline {

    public static build(scope: Construct, props: PipelineProps) : cdkpipelines.CodePipeline {
        let codePipelineSource : cdkpipelines.CodePipelineSource | undefined = undefined;

        switch (true) {
          case isCodeCommitRepo(props.repository):{
            let codeCommitRepo = props.repository as CodeCommitSourceRepository;
            codePipelineSource = cdkpipelines.CodePipelineSource.codeCommit(
              codecommit.Repository.fromRepositoryName(
                scope,
                'cdk-eks-blueprints',
                codeCommitRepo.codeCommitRepoName
              ),
              codeCommitRepo.targetRevision ?? 'master',
              codeCommitRepo.codeCommitOptions
            );
            break;
          }
          case isCodeStarConnection(props.repository):{
            let codeStarConnection =
              props.repository as CodeStarConnectionRepository;
            const repoOwner = codeStarConnection.owner ?? props.owner;
            codePipelineSource = cdkpipelines.CodePipelineSource.connection(
              `${repoOwner}/${codeStarConnection.repoUrl}`,
              codeStarConnection.targetRevision ?? 'main',
              { connectionArn: codeStarConnection.codeStarConnectionArn }
            );
            break;
          }

          default:{
            let gitHubRepo = props.repository as GitHubSourceRepository;
            let githubProps: cdkpipelines.GitHubSourceOptions = {};
            const gitHubOwner = gitHubRepo.owner ?? props.owner;

            if (gitHubRepo.credentialsSecretName) {
              githubProps = {
                authentication: cdk.SecretValue.secretsManager(
                  gitHubRepo.credentialsSecretName!
                ),
              };
            }
            codePipelineSource = cdkpipelines.CodePipelineSource.gitHub(
              `${gitHubOwner}/${gitHubRepo.repoUrl}`,
              gitHubRepo.targetRevision ?? 'main',
              { 
                ...githubProps,
                trigger: gitHubRepo.trigger ?? GitHubTrigger.WEBHOOK,

              }
            );
            break;
          }
        }

        const app = props.application ? `--app '${props.application}'` : "";

        const path = props.repository.path ?? "./";

        return new cdkpipelines.CodePipeline(scope, props.name, {
            pipelineName: props.name,
            synth: new cdkpipelines.ShellStep(`${props.name}-synth`, {
              input: codePipelineSource,
              primaryOutputDirectory: `${path}/cdk.out`,
              installCommands: [
                'n stable',
                'npm install -g aws-cdk@2.132.0',
                `cd $CODEBUILD_SRC_DIR/${path} && npm install`
              ],
              commands: [`cd $CODEBUILD_SRC_DIR/${path}`, 'npm run build', 'npx cdk synth ' + app]
            }),
            crossAccountKeys: props.crossAccountKeys,
            codeBuildDefaults: {
                rolePolicy: props.codeBuildPolicies    
            },
            
          });
    }
}