# Release Prep Runbook

Living document for cutting a new release of `@aws-quickstart/eks-blueprints`.
Add notes/decisions as we go.

## Branch & PR conventions
- Branch: `task/<version>-release-prep` (e.g. `task/1.19.0-release-prep`)
- PR title: `Task/<version> release prep`
- Base: `main`. Do NOT push directly to main.

## Standard flow (in order)
1. Bump `version` in `package.json` (e.g. 1.18.2 -> 1.19.0).
2. Bump all CDK to latest:
   - `peerDependencies.aws-cdk-lib` -> latest (`npm view aws-cdk-lib version`)
   - `peerDependencies.aws-cdk` (CLI) -> latest (`npm view aws-cdk version`)
   - Update the pinned CLI version in `README.md` (`npm install -g aws-cdk@<ver>` / `# must output <ver>`)
   - `@aws-cdk/lambda-layer-kubectl-vXX` layers (handled by ncu)
   - Note: aws-cdk-lib / aws-cdk live in `peerDependencies` pinned exactly, so `ncu` does NOT bump them by default — bump manually.
3. Bump all npm libraries to latest via `npx npm-check-updates -u` (include majors).
   - If a major later breaks build/tests, revert that single package and DOCUMENT it in the "Reverts / exceptions" section below.
4. Delete `package-lock.json` and `node_modules`, then `npm install`.
5. `make build` — monitor for errors.
6. `make run-test` — monitor for errors.
7. Generate the helm chart upgrade report and present the bump matrix for review.
   - Report is produced by synthing with `HelmAddOn.validateHelmVersions = true`
     (already enabled in `examples/blueprint-construct/index.ts`); the checker logs
     `Upgrade is needed for chart X-<ver>: latest version is <ver>.`
   - OCI charts (e.g. Karpenter, `oci://public.ecr.aws/karpenter/karpenter`) are SKIPPED by
     `listChartVersions` (see `lib/addons/helm-addon/helm-version-checker.ts`). Check these
     separately, e.g. `helm show chart oci://public.ecr.aws/karpenter/karpenter --version <v>`
     or list tags from the registry.
8. Present the full helm matrix (repo charts + OCI charts) to the user; user decides exclusions
   before any chart version is changed.

## Verification
- Build must pass (`make build`) and tests must pass (`make run-test`) before opening the PR.
- Clean up any temp files.

## Reverts / exceptions
(Track any library/chart held back from latest and why.)
- **typescript**: held at `^5.9.3` (latest 5.x), NOT `6.0.3`. CDK's own toolchain builds with
  `typescript ~5.9.3` (aws-cdk-lib devDep) and jsii hasn't moved CDK to TS6. TS6 introduced two
  breaking changes that broke our build: (1) TS5011 requires explicit `rootDir` when `outDir` is set;
  (2) namespace imports of CJS modules are no longer callable, breaking `import * as assert from "assert"`
  in 11 files. Staying on 5.9.x avoids both cleanly. Revisit when CDK/jsii move their build to TS6.

## CDK-related code fixes (from bumping aws-cdk-lib 2.250.0 -> 2.261.0)
- `lib/cluster-providers/asg-cluster-provider.ts`: CDK 2.261 changed autoscaling `deletionProtection`
  from `boolean` to the `DeletionProtection` enum (aws-autoscaling). `AsgClusterProviderProps` extended
  both `Partial<eks.CommonClusterOptions>` (EKS `deletionProtection: boolean`) and `AutoscalingNodeGroup`
  (now the ASG enum), colliding with the EKS boolean expected by `GenericClusterProviderProps`.
  Fix: `Omit<AutoscalingNodeGroup, "deletionProtection">` in `AsgClusterProviderProps`. Cluster-level EKS
  deletionProtection still works; ASG-level remains settable via `autoscalingNodeGroups[]`.

## Current run: 1.19.0
- Branch: `task/1.19.0-release-prep`
- CDK targets: aws-cdk-lib 2.250.0 -> 2.261.0; aws-cdk CLI 2.1118.4 -> 2.1129.0; README pin 2.1109.0 -> 2.1129.0
- Library policy: bump ALL to latest incl. majors; revert individually if broken (document above).
- Helm: produce full matrix incl. OCI charts; user approves exclusions before applying.
