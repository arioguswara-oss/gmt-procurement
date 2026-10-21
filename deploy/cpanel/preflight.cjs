'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const checks = [];
const add = (name, ok, detail='') => checks.push({name, ok, detail});

const major = Number(process.versions.node.split('.')[0]);
add('Node.js >= 22', major >= 22, process.version);
add('app.js', fs.existsSync(path.join(root, 'app.js')), path.join(root, 'app.js'));
add('API build', fs.existsSync(path.join(root, 'apps/api/dist/main.js')), 'apps/api/dist/main.js');
add('React build', fs.existsSync(path.join(root, 'apps/web/dist/index.html')), 'apps/web/dist/index.html');
add('Prisma schema', fs.existsSync(path.join(root, 'apps/api/prisma/schema.prisma')), 'apps/api/prisma/schema.prisma');

for (const item of checks) {
  console.log(`${item.ok ? 'OK ' : 'ERR'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
}
if (checks.some((x) => !x.ok)) process.exitCode = 1;
