import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let count = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', 'data', '.npm-cache', 'libs'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(m?js)$/.test(file)) {
      const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: readFileSync(file), encoding: 'utf8' });
      if (result.status) { console.error(file, result.stderr); process.exitCode = 1; }
      count++;
    }
  }
}
for (const dir of ['socket', 'backend', 'minigames_backend/src', 'minigames_backend/test', 'web/js', 'scripts', 'tests']) walk(dir);
console.log(`Syntax checked: ${count} JavaScript files`);
