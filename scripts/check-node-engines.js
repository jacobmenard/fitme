// Verifies every installed package declares support for the target Node version.
// Usage: npm run check:node-engines  (or: node scripts/check-node-engines.js 22.13.1)
const fs = require('fs'), path = require('path');
const dir = path.resolve(__dirname, '..'), target = process.argv[2] || '22.13.1';
const semver = require(path.resolve(dir, 'node_modules/semver'));
const lock = JSON.parse(fs.readFileSync(path.join(dir, 'package-lock.json'), 'utf8'));
const bad = [];
let n = 0;
for (const [p, info] of Object.entries(lock.packages)) {
  if (!p) continue;
  const e = info.engines && info.engines.node;
  if (!e) continue;
  n++;
  if (!semver.satisfies(target, e, { includePrerelease: true })) bad.push(`${p.replace(/^.*node_modules\//, '')}@${info.version} needs node ${e}${info.dev ? ' (dev)' : ''}${info.optional ? ' (optional)' : ''}`);
}
console.log(`checked ${n} packages with engines.node against ${target}`);
if (bad.length) { console.error('INCOMPATIBLE:\n' + bad.join('\n')); process.exit(1); }
console.log('all compatible');
