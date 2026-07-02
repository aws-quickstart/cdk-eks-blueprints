/* Release helm chart audit: extracts chart/version/repository from every addon,
 * then reports the latest available version. HTTP repos use the repo's own checker;
 * OCI repos (skipped by the checker) are queried with `helm show chart`. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { listChartVersions, semverComparator } = require('./dist/addons/helm-addon/helm-version-checker');

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.ts')) acc.push(p);
  }
  return acc;
}

function extractAll(src, re) {
  const out = []; let m;
  while ((m = re.exec(src)) !== null) out.push(m[1]);
  return out;
}

// Resolve a captured token: if quoted -> literal; if identifier -> look up `const IDENT = "..."` in file.
function resolveToken(tok, src) {
  if (tok == null) return undefined;
  const q = tok.match(/^["'`](.+)["'`]$/);
  if (q) return q[1];
  const re = new RegExp('\\b' + tok.replace(/[$]/g, '\\$') + '\\s*=\\s*["\'`]([^"\'`]+)["\'`]');
  const m = src.match(re);
  return m ? m[1] : undefined;
}

const TOK = '(["\'`][^"\'`]+["\'`]|[A-Za-z_$][\\w$.]*)';

const files = walk('lib/addons');
const rows = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const repos = extractAll(src, /repository:\s*["'`]((?:https?|oci):\/\/[^"'`]+)["'`]/g);
  if (repos.length === 0) continue;
  const charts = extractAll(src, new RegExp('\\bchart:\\s*' + TOK, 'g')).map(t => resolveToken(t, src));
  const versions = extractAll(src, new RegExp('\\bversion:\\s*' + TOK, 'g')).map(t => resolveToken(t, src));
  for (let i = 0; i < repos.length; i++) {
    rows.push({
      file: f.replace('lib/addons/', ''),
      chart: charts[i] ?? charts[0] ?? '?',
      current: versions[i] ?? versions[0] ?? '?',
      repository: repos[i],
    });
  }
}

function latestOci(repo) {
  try {
    const out = cp.execSync(`helm show chart ${repo} 2>/dev/null`, { encoding: 'utf8', timeout: 60000 });
    const m = out.match(/^version:\s*(.+)$/m);
    return m ? m[1].trim() : undefined;
  } catch { return undefined; }
}

const results = [];
for (const r of rows) {
  let latest, note = '';
  if (r.repository.startsWith('oci://')) {
    latest = latestOci(r.repository);
    note = 'OCI';
  } else {
    try {
      let vs = listChartVersions({ chart: r.chart, version: r.current, repository: r.repository });
      vs = (vs || []).sort(semverComparator);
      latest = vs[0];
    } catch (e) { latest = undefined; note = 'ERR'; }
  }
  const trim = v => (v && v.charAt(0) === 'v' ? v.substring(1) : v);
  const upgrade = latest && trim(latest) !== trim(r.current);
  results.push({ ...r, latest: latest ?? '(unknown)', upgrade: upgrade ? 'YES' : (latest ? 'no' : '?'), note });
}

results.sort((a, b) => (a.upgrade === b.upgrade ? a.chart.localeCompare(b.chart) : (a.upgrade === 'YES' ? -1 : 1)));
console.log(JSON.stringify(results, null, 2));
