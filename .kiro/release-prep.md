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
- **ESM-only majors held at last CJS-compatible line** (project is CommonJS; `ncu -u` pulled ESM-only
  majors that crash at runtime under `require()` with `ReferenceError: exports is not defined`):
  - `ts-md5`: `^1.3.1` (NOT 2.x — v2 is ESM-only, no CJS export). This was the CI failure in the PR
    (`node_modules/ts-md5/dist/index.cjs.js` treated as ESM).
  - `ts-deepmerge`: `^7.0.0` (NOT 8.x). Imported in 33 files.
  - `uuid`: `^11.1.0` (NOT 14.x).
  - `zod`: `^3.22.4` (NOT 4.x).
  Verified fix: `make build` EXIT 0 and `npx cdk list` EXIT 0 (was crashing on ts-md5).
  Strategic decision (option 1): hold for 1.19.0; tracked separately for an ESM-migration /
  dependency-modernization effort (evaluate ESM migration once CDK/ts-node ESM support is solid;
  meanwhile consider replacing `uuid`->`crypto.randomUUID()` and `ts-md5`->`crypto.createHash('md5')`
  to shrink the ESM-blocked set).

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

## Helm chart bumps — 1.19.0 (applied)
Applied 25 chart upgrades (build green). Excluded 4 majors -> tracking issues.
- Applied (safe + approved majors): airflow 1.18.0->1.22.0, aws-calico 0.3.10->0.3.11,
  aws-load-balancer-controller 3.1.0->3.4.0, aws-mountpoint-s3-csi-driver 2.4.1->2.7.0,
  aws-privateca-issuer v1.8.0->v1.9.0, cert-manager v1.19.4->v1.20.3, external-dns 1.20.0->1.21.1,
  external-secrets 2.0.1->2.7.0, gatekeeper 3.21.1->3.22.2, ingress-nginx 4.14.3->4.15.1,
  istio (base/cni/gateway/istiod, ISTIO_VERSION) 1.29.0->1.30.2, keda 2.19.0->2.20.1,
  kro 0.9.1->0.9.2, kube-state-metrics 7.2.0->7.5.1, kuberay-operator 1.5.1->1.6.2,
  metrics-server 3.13.0->3.13.1, nginx-ingress 2.4.4->2.6.1, prometheus-node-exporter 4.52.0->4.55.0,
  secrets-store-csi-driver 1.5.6->1.6.0, flux2 2.16.4->2.18.4,
  karpenter(v1) 1.9.0->1.13.0, argo-cd 9.4.7->10.1.0, aws-efs-csi-driver 3.4.0->4.3.0,
  gpu-operator v25.10.1->v26.3.3.
- Excluded (deferred majors, tracking issues): jupyterhub 2.0.0->4.4.0 (#1260),
  backstage 0.17.0->2.8.2 (#1258), falco 2.0.15->9.1.0 (#1257), velero 3.2.0->12.1.0 (#1259).
- Reverted after deploy failure: tigera-operator v3.32.1 -> back to v3.31.4 (#1261). v3.32.1 applies
  new Calico CRs (Goldmane/Whisker/APIServer/Installation) before their CRDs exist ("ensure CRDs are
  installed first") -> deploy of bp-addon-calico-operator failed and rolled back the stack.
- Left as-is: cluster-autoscaler (version 'auto', dynamic); karpenter legacy index.ts v0 1.2.1
  (would break CRDs if moved to v1 1.13.0); aws-node-termination-handler 0.27.2 (already > eks-charts
  repo max 0.21.0 — do not downgrade). Manual-check: aws-gateway-controller-chart (OCI tag lookup
  failed), universal-crossplane (upbound repo 403).

## Feature flags
- `cdk.json`: set `@aws-cdk/core:defaultCrossStackReferences` = `"strong"` (behavior-preserving; silences
  the new aws-cdk-lib 2.261 cross-stack-reference-strength warning). `strong` == prior implicit default.

## Outstanding before release
- [ ] Run `make run-test` (was deferred this session) and fix any fallout.
- [ ] Cleanup commit to remove `_helm_audit.js` (temp file accidentally committed in 5dbc561a).
- [ ] Consider adding the excluded chart issues to a milestone.
