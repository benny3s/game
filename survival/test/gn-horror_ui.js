// 호러 레이스 화면 시험: node survival/test/gn-horror_ui.js [--shots <폴더>]  — 공용 gn_ui.js 를 390×844 와 375×667 두 크기로
'use strict';
const cp = require('child_process'), path = require('path');
const args = process.argv.slice(2), at = args.indexOf('--shots');
const extra = at >= 0 && args[at + 1] ? ['--shot', args[at + 1]] : [];
let code = 0;
for (const small of [false, true]) {
  const r = cp.spawnSync(process.execPath, [path.join(__dirname, 'gn_ui.js'), 'gn-horror', ...extra, ...(small ? ['--small'] : [])], { stdio: 'inherit' });
  if (r.status) code = r.status;
}
process.exit(code);
